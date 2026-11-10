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
import { isJunkClip } from "@/core/studio/curator.core";
import { fuseRankClips } from "@/core/corpus/vector-fusion.core";
import { embedQuery, vectorSearchOn } from "@/core/corpus/query-embed.core";
import { clipEmbeddingRepo } from "@/core/corpus/clip-embedding.repo";

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
  // [T3.3] worthy 门禁字段（isEligible 复检用）
  worthyScore: true,
};

/**
 * [T3.3] worthyScore 门禁工作点（考卷定标 grade-worthiness：th=0.4 → P 88.0%/R 55.9%）。
 * 口径：未判（null，顽固失败窗残缺）不误杀——null OR ≥th。
 */
const WORTHY_THRESHOLD = 0.4;
const worthyGate = {
  OR: [{ worthyScore: { gte: WORTHY_THRESHOLD } }, { worthyScore: null }],
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
  // [T3.3] worthy 门禁字段
  worthyScore: number | null;
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
      // AND 级合成：证据命中 AND worthy 门禁（T3.3：null 未判不误杀）
      AND: [
        {
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
        },
        worthyGate,
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
    // [M3/T3.1] 三路融合：证据分 + 向量车道（FLAG 门控，fail-open 回落关键词路）
    return fuseRankClips({
      query: q,
      usable,
      rankCtx: {
        phrases,
        perPhraseWords: phrases.map(phraseContentWords),
        query: q,
        grams: [...zhWords, ...grams], // 中文内容词并进 grams 车道（zhText 命中 +6/词）
      },
      limit: CLIP_RESULT_LIMIT,
      fetchByClipIds: async (ids) =>
        (await prisma.corpus_clips.findMany({
          where: { clipid: { in: ids } },
          select: CLIP_SELECT,
        })) as ClipRow[],
      isEligible: (r: ClipRow) =>
        !isJunkClip(
          { enText: r.enText, duration: r.duration, wpm: r.wpm },
          { minDurationSec: 4, maxDurationSec: 15 },
        ) &&
        !hasSensitiveTerm(r.enText) &&
        !hasSensitiveTerm(r.zhText) &&
        // [T3.3] 向量补召回同过 worthy 门禁（null 未判不误杀）
        (r.worthyScore == null || r.worthyScore >= WORTHY_THRESHOLD),
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
  zhWords: string[],
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
  const SCENE_SELECT = {
    sceneid: true,
    episodeid: true,
    title: true,
    summaryZh: true,
    situationTag: true,
    cefrLevel: true,
    coverUrl: true,
    duration: true,
    clipsJson: true,
  } as const;
  type SceneRow = {
    sceneid: string;
    episodeid: string;
    title: string;
    summaryZh: string | null;
    situationTag: string | null;
    cefrLevel: string | null;
    coverUrl: string | null;
    duration: number;
    clipsJson: unknown;
  };

  // ① 关键词路：title/summaryZh/situationTag（T2.3 后标签已是受控枚举中文）
  const allGrams = [...zhWords, ...grams];
  const kwWhere = {
    duration: { gte: SCENE_DURATION_MIN, lte: SCENE_DURATION_MAX },
    ...(levels.length ? { cefrLevel: { in: levels } } : {}),
    OR: [
      { title: { contains: q } },
      { summaryZh: { contains: q } },
      ...zhWords.map((w) => ({ situationTag: { contains: w } })),
      ...allGrams.map((g) => ({ title: { contains: g } })),
      ...allGrams.map((g) => ({ summaryZh: { contains: g } })),
    ],
  };
  const kwRows = (await prisma.micro_scenes.findMany({
    where: kwWhere,
    select: SCENE_SELECT,
    orderBy: { createdAt: "desc" },
    take: 30,
  })) as SceneRow[];

  // ② 向量路（FLAG 门控）：embeddingZh 近邻——T2.3 身份重建后语义密度已就位
  const vecSim = new Map<string, number>();
  if (vectorSearchOn()) {
    const qv = await embedQuery(q);
    if (qv) {
      const hits = await clipEmbeddingRepo.nearestScenes(qv, 10);
      for (const h of hits) {
        if (h.similarity >= 0.3) vecSim.set(h.id, h.similarity);
      }
    }
  }

  // 合并池：关键词 ∪ 向量命中（向量路独有场景补拉）
  const pool: SceneRow[] = [...kwRows];
  const kwIds = new Set(kwRows.map((r) => r.sceneid));
  const vecOnly = [...vecSim.keys()].filter((id) => !kwIds.has(id));
  if (vecOnly.length > 0) {
    const extra = (await prisma.micro_scenes.findMany({
      where: { sceneid: { in: vecOnly.slice(0, 5) } },
      select: SCENE_SELECT,
    })) as SceneRow[];
    pool.push(...extra);
  }

  // ③ 融合评分：关键词证据 + 向量相似度
  const SCENE_VEC_W = 6; // sim 0.6→+3.6，与 title 完整命中 +3 同量纲
  let best: SceneRow | null = null;
  let bestScore = 0;
  for (const r of pool) {
    if (hasSensitiveTerm(r.title) || hasSensitiveTerm(r.summaryZh)) continue;
    let kwScore = 0;
    if (r.title.includes(q)) kwScore += 3;
    if ((r.summaryZh || "").includes(q)) kwScore += 2;
    for (const g of allGrams) {
      if (r.title.includes(g)) kwScore += 1;
      if ((r.summaryZh || "").includes(g)) kwScore += 1;
    }
    kwScore = Math.min(kwScore, 8);
    const vScore = (vecSim.get(r.sceneid) ?? 0) * SCENE_VEC_W;
    const total = kwScore + vScore;
    if (total > bestScore) {
      bestScore = total;
      best = r;
    }
  }
  if (!best || bestScore < 1) return null;

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

/**
 * [UX 2026-11-09] 无相关语料门——3 路自一致性打分投票（单问二元裁决实测两个
 * 方向都会翻车：复合意图被整单否决/相邻话题被放行；纯阈值门经 50 query 金
 * 标准校准也不可行——信号重叠 60% 准确率封顶。故：top-5 候选逐条 0-10 场景
 * 相关度打分，3 路并行（1 路温度 0 + 2 路温度 0.5 制造有效多样性，延迟≈单
 * 次）取每条中位分，任一条中位 ≥6 即放行）。null = 投票失败（fail-open 按
 * 命中返回）。30min 缓存。
 */
const judgeCache = new Map<string, { verdict: boolean; at: number }>();
const JUDGE_CACHE_TTL_MS = 30 * 60 * 1000;
const JUDGE_SCORE_PASS = 6;
const JUDGE_VOTES = 3;

async function judgeOnce(
  q: string,
  top: Array<{ enText: string; zhText: string | null }>,
  temperature: number,
): Promise<number[] | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const modelName = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const user = `意图：${q}\n候选：\n${top
    .map(
      (t, i) => `${i + 1}. EN: ${t.enText}\n   ZH: ${t.zhText || "（无译文）"}`,
    )
    .join("\n")}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
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
          {
            role: "system",
            content: `你是检索结果审核员，对每个候选英文原声句独立打「与用户意图的场景相关度」分（0-10）：
- 9-10 = 该句在意图场景里母语者真的会说 / 直接教该场景的核心表达（「咖啡厅点单」→ "Can I get a latte to go?"）；
- 6-8 = 覆盖意图的部分主要维度（复合意图如「点单+闲聊」→ 咖啡馆闲聊句；「面试谈缺点」→ 谈如何面对批评改进）；
- 3-5 = 话题沾边但场景不同（谈咖啡文化纪录片、通用学习建议句）；
- 0-2 = 场景完全无关（仅个别词偶合）。
输出严格 JSON：{"scores": [8,2,5,0,3]}——与候选一一对应的整数数组。`,
          },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature,
        max_tokens: 80,
      }),
    });
    if (!res.ok) return null;
    const result = await res.json();
    const parsed = JSON.parse(
      result.choices?.[0]?.message?.content || "{}",
    ) as { scores?: unknown };
    if (!Array.isArray(parsed.scores) || parsed.scores.length !== top.length)
      return null;
    const scores = parsed.scores.map((v) =>
      typeof v === "number" && v >= 0 && v <= 10 ? v : -1,
    );
    if (scores.some((s) => s < 0)) return null;
    return scores;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function judgeRelevance(
  q: string,
  top: Array<{ enText: string; zhText: string | null; clipid: string }>,
): Promise<boolean | null> {
  const cacheKey = q + "::" + top.map((t) => t.clipid).join(",");
  const hit = judgeCache.get(cacheKey);
  if (hit && Date.now() - hit.at < JUDGE_CACHE_TTL_MS) return hit.verdict;

  const votes = await Promise.all(
    Array.from({ length: JUDGE_VOTES }, (_, i) =>
      judgeOnce(q, top, i === 0 ? 0 : 0.5),
    ),
  );
  const valid = votes.filter((v): v is number[] => v !== null);
  if (valid.length === 0) return null; // 全军覆没 → fail-open
  // 每条候选取各票中位分；任一条中位 ≥ 阈值 → 放行
  let verdict = false;
  for (let c = 0; c < top.length; c++) {
    const col = valid.map((v) => v[c]).sort((a, b) => a - b);
    const median = col[Math.floor(col.length / 2)];
    if (median >= JUDGE_SCORE_PASS) {
      verdict = true;
      break;
    }
  }
  if (judgeCache.size > 300) {
    const first = judgeCache.keys().next().value;
    if (first) judgeCache.delete(first);
  }
  judgeCache.set(cacheKey, { verdict, at: Date.now() });
  return verdict;
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
      pickScene(q, grams, levels, zhWords),
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

    // [UX 2026-11-09] 无相关语料门：语料靠日常积累、不作为提分杠杆——
    // 语义不相关时显式 noMatch（前端提示），绝不静默降级到不相关内容。
    // 判据：召回为空 → 直接 noMatch；有召回 → DeepSeek 快裁 top-3（30min 缓存，
    // fail-open：裁决失败按命中返回，防 LLM 抖动误报"无相关语料"）。
    let noMatch = false;
    if (picked.length === 0) {
      noMatch = true;
    } else {
      // 裁决窗口 top-5（实测教训：top-3 时最相关的句子恰在 4-6 名，
      // 排序噪声会劫持判定——「咖啡厅点单闲聊」即此病例）
      const judged = await judgeRelevance(q, picked.slice(0, 5));
      if (judged === false) noMatch = true;
    }

    return NextResponse.json({
      success: true,
      data: {
        clips: noMatch ? [] : clips,
        scene: noMatch ? null : scene,
        source: phrases.length || zhWords.length ? "llm" : "keyword",
        noMatch,
        ...(noMatch ? { message: "无相关语料" } : {}),
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
