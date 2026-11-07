import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { signOssHttpUrl } from "@/lib/oss";
import {
  detectFastLinks,
  hasSensitiveTerm,
  type TimedWord,
} from "@/core/corpus/clip-core";
import { authWithMobile } from "@/core/auth/guard";
import { anonymousLlmRateAllow } from "@/lib/dictionary-quota";
import { isJunkClip, rankSemanticClips } from "@/core/studio/curator.core";

/**
 * [STUDIO] POST /api/scenes/match — 意图定制微场景的选料匹配。
 *
 * Body: { q: 目标/场景想法（中文）, levels?: string[]（CEFR 多选） }
 * 200 { success, data: { clips[], scene|null, source } }
 *   clips ≤4：意图匹配的单句切片（4–15s，词级时间戳）——复刻 semantic-search
 *     的检索管线（DeepSeek 双语扩词：英文词块 phrases + 中文内容词 zhWords
 *     → 关键词/中文译文多车道召回 → isJunkClip 门禁 → rankSemanticClips
 *     多证据排序，中文内容词并进 grams 车道 zhText 命中 +6/词），
 *     难度多选入参是本路由的增量；
 *   scene ≤1：微场景（micro_scenes 15–45s，3–6 句连续语境，clipsJson 自带
 *     词级时间戳）——标题/摘要按查询原文与二字滑窗匹配打分取最优；
 *   source: "llm"（扩词命中，走了 LLM）| "keyword"（fail-open 纯关键词）。
 *
 * 成本防线对齐 semantic-search：扩词 30min 缓存命中不计数；未命中游客按
 * IP 日限、登录用户 10s 冷却。扩词失败 fail-open 空扩词（中文 gram 兜底召回）。
 * 无需登录；音频不出本路由（客户端经 /api/clips/{id}/audio 唯一出口懒取，
 * sceneid 同样走该网关）。
 *
 * 注：扩词/停用词/滑窗助手与 semantic-search 路由同款重复实现（该路由处于
 * 未提交工作区，不做抽共库改动）；门禁与排序复用 curator.core 现成导出。
 */
const LLM_TIMEOUT_MS = 20_000;
const PHRASE_CACHE_TTL_MS = 30 * 60 * 1000;
const PHRASE_CACHE_MAX = 300;
const USER_COOLDOWN_MS = 10_000;
const CLIP_RESULT_LIMIT = 4;
const SCENE_DURATION_MIN = 15;
const SCENE_DURATION_MAX = 45;

const SYSTEM_PROMPT = `你是英语场景检索助手。用户给出一个中文场景或学习意图，你产出双语检索词用于语料库检索。
输出严格为 JSON 对象：{"phrases": string[], "zhWords": string[]}
- phrases：3-5 个英文短语，每个 1-4 个单词，全部小写；覆盖该场景的不同常见说法（如预约可以说 make an appointment / book a table / schedule a call）；只输出高频自然表达，禁止编造生僻词；
- zhWords：2-6 个中文内容词（该场景的关键名词/动词，如「面试」「缺点」「点单」「买票」「寒暄」），用于中文译文检索；禁止虚词与单字。`;

const phraseCache = new Map<
  string,
  { phrases: string[]; zhWords: string[]; at: number }
>();
const userHits = new Map<string, number>();

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
  "by",
  "with",
  "about",
  "as",
  "into",
  "through",
  "during",
  "before",
  "after",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "can",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "must",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "this",
  "that",
  "these",
  "those",
  "my",
  "your",
  "his",
  "her",
  "its",
  "our",
  "their",
  "me",
  "him",
  "us",
  "them",
  "what",
  "which",
  "who",
  "whom",
  "how",
  "when",
  "where",
  "why",
  "not",
  "no",
  "yes",
  "and",
  "or",
  "but",
  "if",
  "because",
  "so",
  "than",
  "too",
  "very",
  "just",
  "also",
  "am",
  "bit",
  "sure",
  "let",
  "lets",
  "going",
  "gonna",
  "us",
]);
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

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function phraseContentWords(phrase: string): string[] {
  return phrase
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !WEAK_WORDS.has(w));
}

/** 中文查询 → 2 字滑窗（"电话预约" → 电话/话预/预约） */
function zhGrams(q: string): string[] {
  if (!/^[\u4e00-\u9fa5\s]+$/.test(q)) return [];
  const grams: string[] = [];
  for (let i = 0; i < q.length - 1; i++) {
    const g = q.slice(i, i + 2);
    if (!grams.includes(g)) grams.push(g);
  }
  return grams.slice(0, 6);
}

/** DeepSeek 双语扩词（30min 缓存；任何异常 fail-open 双空数组） */
async function expandPhrases(
  q: string,
): Promise<{ phrases: string[]; zhWords: string[] }> {
  const cached = phraseCache.get(q);
  if (cached && Date.now() - cached.at < PHRASE_CACHE_TTL_MS) {
    return { phrases: cached.phrases, zhWords: cached.zhWords };
  }
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return { phrases: [], zhWords: [] };
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
        max_tokens: 400,
      }),
    });
    if (!res.ok) return { phrases: [], zhWords: [] };
    const result = await res.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) return { phrases: [], zhWords: [] };
    const parsed = JSON.parse(content) as {
      phrases?: unknown;
      zhWords?: unknown;
    };
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
    // 中文内容词：2-8 字、含汉字、去重（召回车道 + 排序 grams 车道共用）
    const zhWords = (Array.isArray(parsed.zhWords) ? parsed.zhWords : [])
      .filter(
        (w): w is string =>
          typeof w === "string" && /^[\u4e00-\u9fa5]{2,8}$/.test(w.trim()),
      )
      .map((w) => w.trim())
      .filter((w, i, arr) => arr.indexOf(w) === i)
      .slice(0, 6);
    if (phrases.length > 0 || zhWords.length > 0) {
      if (phraseCache.size >= PHRASE_CACHE_MAX) {
        const firstKey = phraseCache.keys().next().value;
        if (firstKey) phraseCache.delete(firstKey);
      }
      phraseCache.set(q, { phrases, zhWords, at: Date.now() });
    }
    return { phrases, zhWords };
  } catch {
    return { phrases: [], zhWords: [] };
  } finally {
    clearTimeout(timer);
  }
}

/** 数据驱动连读提示（feed 路由同款；clip-core 不在本次改动面内故就地重复） */
function buildPhoneticTip(words: TimedWord[], wpm: number): string | null {
  const links = detectFastLinks(words);
  if (links.length) {
    const b = links[0];
    const next = words[b.endIdx + 1]?.word;
    const phrase = next ? `${b.text} ${next}` : b.text;
    return `注意 '${phrase}' 中 '${b.text}' 的弱读连读（仅 ${Math.round(b.durationSec * 1000)}ms），粘成一团念更地道。`;
  }
  if (wpm > 0) {
    return `本句语速 ${wpm} 词/分钟，建议 0.75x 慢速跟上后再常速跟读。`;
  }
  return null;
}

const CLIP_SELECT = {
  clipid: true,
  episodeid: true,
  subtitleId: true,
  startTime: true,
  endTime: true,
  duration: true,
  enText: true,
  zhText: true,
  wordsJson: true,
  wpm: true,
  cefrLevel: true,
  coverUrl: true,
  sourceLabel: true,
  topicTags: true,
};

type ClipRow = {
  clipid: string;
  episodeid: string;
  subtitleId: number;
  startTime: number;
  endTime: number;
  duration: number;
  enText: string;
  zhText: string | null;
  wordsJson: unknown;
  wpm: number;
  cefrLevel: string | null;
  coverUrl: string | null;
  sourceLabel: string | null;
  topicTags: string[];
};

async function pickClips(
  q: string,
  phrases: string[],
  keywords: string[],
  zhWords: string[],
  grams: string[],
  levels: string[],
): Promise<ClipRow[]> {
  const wordBoundaryHit = (hay: string, needle: string) =>
    new RegExp(`\\b${escapeRe(needle)}\\b`, "i").test(hay);

  const run = async (withLevels: boolean): Promise<ClipRow[]> => {
    const where = {
      duration: { gte: 4, lte: 15 }, // 意图定制放宽到单句 4-15s（feed 微流口径 4-10 不变）
      wordsJson: { not: Prisma.DbNull },
      zhText: { not: null },
      ...(withLevels && levels.length ? { cefrLevel: { in: levels } } : {}),
      OR: [
        ...phrases.map((p) => ({
          enText: { contains: p, mode: "insensitive" as const },
        })),
        ...keywords.map((k) => ({
          enText: { contains: k, mode: "insensitive" as const },
        })),
        { zhText: { contains: q } },
        ...zhWords.map((w) => ({ zhText: { contains: w } })),
        ...grams.map((g) => ({ zhText: { contains: g } })),
      ],
    };
    const rows = await prisma.corpus_clips.findMany({
      where,
      select: CLIP_SELECT,
      orderBy: { wpm: "asc" },
      take: 300,
    });
    const usable = rows.filter(
      (r) =>
        !isJunkClip(
          {
            enText: r.enText,
            duration: r.duration,
            wpm: r.wpm,
          },
          { minDurationSec: 4, maxDurationSec: 15 },
        ) &&
        !hasSensitiveTerm(r.enText) &&
        !hasSensitiveTerm(r.zhText) &&
        (phrases.some((p) => wordBoundaryHit(r.enText, p)) ||
          keywords.some((k) => wordBoundaryHit(r.enText, k)) ||
          !!(r.zhText && q && r.zhText.includes(q)) ||
          zhWords.some((w) => r.zhText!.includes(w)) ||
          grams.some((g) => r.zhText!.includes(g))),
    );
    return rankSemanticClips(usable, CLIP_RESULT_LIMIT, {
      phrases,
      perPhraseWords: phrases.map(phraseContentWords),
      query: q,
      grams: [...zhWords, ...grams], // 中文内容词并进 grams 车道（zhText 命中 +6/词）
    });
  };

  let picked = levels.length ? await run(true) : await run(false);
  // 难度过滤把池打空 → 放宽难度保意图匹配（难度仅为优选非门槛）
  if (picked.length < 2 && levels.length) {
    picked = await run(false);
  }
  return picked;
}

interface SceneSentence {
  textEn: string;
  textCn: string | null;
  start: number;
  end: number;
  words: TimedWord[];
}

async function pickScene(
  q: string,
  grams: string[],
  levels: string[],
): Promise<{
  sceneid: string;
  episodeid: string;
  title: string;
  summaryZh: string | null;
  situationTag: string | null;
  cefrLevel: string | null;
  coverUrl: string | null;
  duration: number;
  sentences: SceneSentence[];
} | null> {
  const where = {
    duration: { gte: SCENE_DURATION_MIN, lte: SCENE_DURATION_MAX },
    ...(levels.length ? { cefrLevel: { in: levels } } : {}),
    OR: [
      { title: { contains: q } },
      { summaryZh: { contains: q } },
      ...grams.map((g) => ({ title: { contains: g } })),
      ...grams.map((g) => ({ summaryZh: { contains: g } })),
    ],
  };
  const rows = await prisma.micro_scenes.findMany({
    where,
    select: {
      sceneid: true,
      episodeid: true,
      title: true,
      summaryZh: true,
      situationTag: true,
      cefrLevel: true,
      coverUrl: true,
      duration: true,
      clipsJson: true,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  let best: (typeof rows)[number] | null = null;
  let bestScore = 0;
  for (const r of rows) {
    if (hasSensitiveTerm(r.title) || hasSensitiveTerm(r.summaryZh)) continue;
    let score = 0;
    if (r.title.includes(q)) score += 3;
    if ((r.summaryZh || "").includes(q)) score += 2;
    for (const g of grams) {
      if (r.title.includes(g)) score += 1;
      if ((r.summaryZh || "").includes(g)) score += 1;
    }
    score = Math.min(score, 8);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  if (!best) return null;

  const clips =
    (best.clipsJson as { clips?: Array<Record<string, unknown>> } | null)
      ?.clips || [];
  const sentences: SceneSentence[] = clips
    .map((c) => ({
      textEn: String(c.textEn || ""),
      textCn: c.textCn != null ? String(c.textCn) : null,
      start: Number(c.start) || 0,
      end: Number(c.end) || 0,
      words: Array.isArray(c.words) ? (c.words as TimedWord[]) : [],
    }))
    .filter((s) => s.textEn && s.end > s.start)
    .sort((a, b) => a.start - b.start);
  if (!sentences.length) return null;

  return {
    sceneid: best.sceneid,
    episodeid: best.episodeid,
    title: best.title,
    summaryZh: best.summaryZh,
    situationTag: best.situationTag,
    cefrLevel: best.cefrLevel,
    coverUrl: await signOssHttpUrl(best.coverUrl || ""),
    duration: best.duration,
    sentences,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      q?: unknown;
      levels?: unknown;
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
    const levels = (Array.isArray(body?.levels) ? body!.levels : [])
      .map((s) => String(s).trim().toUpperCase())
      .filter((s) => /^[A-C][12]$/.test(s))
      .slice(0, 6);

    // 成本防线：扩词缓存命中不计数；未命中游客 IP 日限 / 登录用户 10s 冷却
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
              message: "生成太频繁，稍后再试",
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
              message: "今日生成次数已用完",
            },
            { status: 429 },
          );
        }
      }
    }

    const { phrases, zhWords } = await expandPhrases(q);
    const keywords: string[] = [];
    phrases.map(phraseContentWords).forEach((ws) =>
      ws.forEach((w) => {
        if (!keywords.includes(w)) keywords.push(w);
      }),
    );
    const grams = zhGrams(q);

    const [picked, scene] = await Promise.all([
      pickClips(q, phrases, keywords, zhWords, grams, levels),
      // 场景打分同样吃中文内容词（标题/摘要命中即强信号）
      pickScene(q, [...zhWords, ...grams], levels),
    ]);

    const clips = await Promise.all(
      picked.map(async (r) => {
        const words = (
          Array.isArray(r.wordsJson) ? r.wordsJson : []
        ) as TimedWord[];
        return {
          clipid: r.clipid,
          episodeid: r.episodeid,
          subtitleId: r.subtitleId,
          podcastTitle: r.sourceLabel || "原声节目",
          topic: r.topicTags && r.topicTags.length ? r.topicTags[0] : "",
          difficulty: r.cefrLevel || "",
          coverUrl: await signOssHttpUrl(r.coverUrl || ""),
          start: r.startTime,
          end: r.endTime,
          duration: r.duration,
          textEn: r.enText,
          textCn: r.zhText || "",
          words,
          phoneticTip: buildPhoneticTip(words, r.wpm),
          wpm: r.wpm,
          clipAudioUrl: null, // 客户端经 /api/clips/{id}/audio 懒取（单一出口）
          clipOffset: r.startTime,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        clips,
        scene,
        source: phrases.length || zhWords.length ? "llm" : "keyword",
      },
    });
  } catch (error) {
    console.error("[POST /api/scenes/match]", error);
    return NextResponse.json(
      { success: false, error: "Scene match failed" },
      { status: 500 },
    );
  }
}
