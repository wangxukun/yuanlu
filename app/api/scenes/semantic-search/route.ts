import { NextResponse } from "next/server";
import { authWithMobile } from "@/core/auth/guard";
import prisma from "@/lib/prisma";
import { signOssHttpUrl } from "@/lib/oss";
import { pickSemanticClips } from "@/core/studio/curator.core";
import { clipAudioService } from "@/core/corpus/clip-audio.service";
import { buildRealClipAudioDeps } from "@/core/corpus/clip-audio.deps";
import { anonymousLlmRateAllow } from "@/lib/dictionary-quota";

/**
 * [工具化转型] POST /api/scenes/semantic-search — 首页场景语义检索。
 *
 * 管线：干净中文意图词 → DeepSeek 扩词（母语者常用英文词块 3-5 个，
 * 30min 进程内缓存 + 失败/超时 fail-open 空扩词）→ corpus_clips 联查
 * （enText 词边界命任一英文词块 OR zhText 含原始中文）→ pickSemanticClips
 * 精选（异剧集优先/词数升序，≤5 条）→ 实体封装（封面现签 + 懒切片直链
 * 现签 + 词级时间戳）。
 *
 * 成本防线：扩词缓存命中不计数不调 LLM；游客按 IP 日限复用词典匿名限流，
 * 登录用户 10s 冷却。纯增量路由，小程序专属消费，网页版零感知。
 * 200 恒成功（items 可能为空），前端自行兜底旧包含检索。
 */
const LLM_TIMEOUT_MS = 20_000;
const PHRASE_CACHE_TTL_MS = 30 * 60 * 1000;
const PHRASE_CACHE_MAX = 300;
const USER_COOLDOWN_MS = 10_000;
const RESULT_LIMIT = 5;

const SYSTEM_PROMPT = `你是英语场景检索助手。用户给出一个中文场景或学习意图，你给出母语者在真实对话中最常说的英文词块或短语，用于语料库检索。
输出严格为 JSON 对象：{"phrases": string[]}
- phrases：3-5 个英文短语，每个 1-4 个单词，全部小写；
- 覆盖该场景的不同常见说法（如预约可以说 make an appointment / book a table / schedule a call）；
- 只输出高频自然表达，禁止编造生僻词。`;

const phraseCache = new Map<string, { phrases: string[]; at: number }>();
const userHits = new Map<string, number>();

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** DeepSeek 扩词（30min 缓存；任何异常 fail-open 返回空数组，检索回落中文包含） */
async function expandPhrases(q: string): Promise<string[]> {
  const cached = phraseCache.get(q);
  if (cached && Date.now() - cached.at < PHRASE_CACHE_TTL_MS) {
    return cached.phrases;
  }
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return [];
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const modelName = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `<scene>${q}</scene>` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 300,
      }),
    });
    if (!res.ok) return [];
    const result = await res.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) return [];
    const parsed = JSON.parse(content) as { phrases?: unknown };
    const phrases = (Array.isArray(parsed.phrases) ? parsed.phrases : [])
      .filter(
        (p): p is string =>
          typeof p === "string" &&
          p.trim().length >= 2 &&
          p.trim().length <= 40,
      )
      .map((p) => p.trim().toLowerCase())
      .filter((p, i, arr) => arr.indexOf(p) === i)
      .slice(0, 5);
    if (phrases.length > 0 && phraseCache.size >= PHRASE_CACHE_MAX) {
      const firstKey = phraseCache.keys().next().value;
      if (firstKey) phraseCache.delete(firstKey);
    }
    if (phrases.length > 0) phraseCache.set(q, { phrases, at: Date.now() });
    return phrases;
  } catch {
    return []; // 超时/网络/解析失败一律 fail-open
  } finally {
    clearTimeout(timer);
  }
}

const CLIP_SELECT = {
  clipid: true,
  episodeid: true,
  subtitleId: true,
  enText: true,
  zhText: true,
  startTime: true,
  endTime: true,
  duration: true,
  cefrLevel: true,
  coverUrl: true,
  wordsJson: true,
};

/** 词块 → 核心内容词（去停用词；句级语料里完整词块命中极低，核心词才是召回面） */
const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "to",
  "for",
  "of",
  "in",
  "on",
  "at",
  "with",
  "and",
  "or",
  "we",
  "you",
  "they",
  "it",
  "is",
  "are",
  "be",
  "my",
  "our",
  "your",
  "this",
  "that",
  "want",
  "need",
  "get",
  "make",
  "have",
  "do",
  "some",
  "any",
  "about",
  "into",
  "from",
  "out",
  "over",
  "under",
  "something",
  "anything",
  "everything",
  "someone",
  "nothing",
  "just",
  "like",
  "really",
  "very",
  "here",
  "there",
  "when",
  "where",
  "what",
  "which",
  "who",
  "how",
  "why",
  "all",
  "lot",
  "bit",
  "sure",
  "let",
  "lets",
  "going",
  "gonna",
  "us",
]);
/** 泛用词黑名单：单命中相关性太弱（time/call/check 类），不得作为直通证据 */
const WEAK_WORDS = new Set([
  "time",
  "call",
  "check",
  "day",
  "way",
  "thing",
  "things",
  "people",
  "good",
  "great",
  "help",
  "next",
  "small",
  "large",
  "every",
  "today",
  "word",
  "words",
  "sentence",
  "sentences",
  "english",
  "listening",
  "speak",
  "talk",
  "quiz",
  "name",
  "part",
  "place",
  "first",
  "right",
]);

function phraseContentWords(phrase: string): string[] {
  return phrase
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !WEAK_WORDS.has(w));
}

function phrasesToKeywords(perPhrase: string[][]): string[] {
  const out: string[] = [];
  for (const ws of perPhrase) {
    for (const w of ws) if (!out.includes(w)) out.push(w);
  }
  return out.slice(0, 12);
}

/** 中文查询 → 2 字滑窗（"电话预约" → 电话/话预/预约；子串枯竭时的中文召回面） */
function zhGrams(q: string): string[] {
  if (!/^[\u4e00-\u9fa5\s]+$/.test(q)) return [];
  const grams: string[] = [];
  for (let i = 0; i < q.length - 1; i++) {
    const g = q.slice(i, i + 2);
    if (!grams.includes(g)) grams.push(g);
  }
  return grams.slice(0, 6);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      q?: unknown;
    } | null;
    const q = String(body?.q ?? "")
      .trim()
      .slice(0, 60);
    if (!q) {
      return NextResponse.json(
        { success: false, error: "Missing query" },
        { status: 400 },
      );
    }

    // 成本防线：缓存未命中才计数（游客 IP 日限 / 登录用户 10s 冷却）
    const cachedPeek = phraseCache.get(q);
    const fresh =
      cachedPeek && Date.now() - cachedPeek.at < PHRASE_CACHE_TTL_MS;
    if (!fresh) {
      const session = await authWithMobile().catch(() => null);
      if (session?.user?.userid) {
        const last = userHits.get(session.user.userid) || 0;
        if (Date.now() - last < USER_COOLDOWN_MS) {
          return NextResponse.json(
            {
              success: false,
              code: "RATE_LIMITED",
              message: "搜索太频繁，稍后再试",
            },
            { status: 429 },
          );
        }
        userHits.set(session.user.userid, Date.now());
      } else {
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
          "local";
        if (!anonymousLlmRateAllow(ip)) {
          return NextResponse.json(
            {
              success: false,
              code: "RATE_LIMITED",
              message: "今日搜索次数已用完",
            },
            { status: 429 },
          );
        }
      }
    }

    const phrases = await expandPhrases(q);
    const perPhraseWords = phrases.map(phraseContentWords);
    const keywords = phrasesToKeywords(perPhraseWords);
    const grams = zhGrams(q);

    const rows = await prisma.corpus_clips.findMany({
      where: {
        OR: [
          ...phrases.map((p) => ({
            enText: { contains: p, mode: "insensitive" as const },
          })),
          ...keywords.map((k) => ({
            enText: { contains: k, mode: "insensitive" as const },
          })),
          { zhText: { contains: q } },
          ...grams.map((g) => ({ zhText: { contains: g } })),
        ],
      },
      select: CLIP_SELECT,
      orderBy: { wpm: "asc" },
      take: 300, // 候选池上限（wpm 慢速优先）
    });

    // 三级召回分层（JS 词边界复检 + 质控）：
    //   L1 完整词块命中 > L2 长专指词(≥6字符)命中或跨短语核心词共现 > L3 中文命中
    //   （短泛词单命中如 time/call/check 不构成 L2 证据，防低相关淹没）
    const phraseRes = phrases.map(
      (p) => new RegExp(`\\b${escapeRe(p)}\\b`, "i"),
    );
    const strongRes = keywords
      .filter((k) => k.length >= 6)
      .map((k) => new RegExp(`\\b${escapeRe(k)}\\b`, "i"));
    const perPhraseRes = perPhraseWords.map((ws) =>
      ws.map((w) => new RegExp(`\\b${escapeRe(w)}\\b`, "i")),
    );
    const zhHit = (r: { zhText: string | null }) =>
      !!(
        r.zhText &&
        ((q && r.zhText.includes(q)) ||
          grams.some((g) => r.zhText!.includes(g)))
      );
    const layer1 = rows.filter((r) =>
      phraseRes.some((re) => re.test(r.enText)),
    );
    const rest1 = rows.filter((r) => !layer1.includes(r));
    const layer2 = rest1.filter((r) => {
      if (strongRes.some((re) => re.test(r.enText))) return true;
      // 跨短语核心词共现：要求 ≥2 个「不同词」各自命中（一词属多短语不算）
      const hitWords = new Set<string>();
      perPhraseRes.forEach((ws, pi) => {
        ws.forEach((re, wi) => {
          if (re.test(r.enText)) hitWords.add(perPhraseWords[pi][wi]);
        });
      });
      return hitWords.size >= 2;
    });
    const layer3 = rest1.filter((r) => !layer2.includes(r) && zhHit(r));
    let picked = pickSemanticClips(layer1, RESULT_LIMIT);
    if (picked.length < RESULT_LIMIT) {
      picked = pickSemanticClips(layer1.concat(layer2), RESULT_LIMIT);
    }
    if (picked.length < RESULT_LIMIT) {
      picked = pickSemanticClips(layer1.concat(layer2, layer3), RESULT_LIMIT);
    }

    // 实体封装：封面现签 + 懒切片直链现签（失败置 null，客户端回落网关懒取）
    const items = await Promise.all(
      picked.map(async (r) => {
        const audio = await clipAudioService
          .ensureClipAudio(r.clipid, buildRealClipAudioDeps())
          .catch(() => null);
        return {
          clipid: r.clipid,
          episodeid: r.episodeid,
          subtitleId: r.subtitleId,
          enText: r.enText,
          zhText: r.zhText,
          duration: r.duration,
          cefrLevel: r.cefrLevel,
          coverUrl: await signOssHttpUrl(r.coverUrl),
          clipAudioUrl: audio && audio.ok ? audio.url : null,
          clipOffset: audio && audio.ok ? audio.clipOffset : r.startTime,
          words: r.wordsJson || [],
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: { phrases, items },
    });
  } catch (error) {
    console.error("[POST /api/scenes/semantic-search]", error);
    return NextResponse.json(
      { success: false, error: "Semantic search failed" },
      { status: 500 },
    );
  }
}
