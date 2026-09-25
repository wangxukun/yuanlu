// yuanlu/core/episode/episode-deep-dive.service.ts

/**
 * [P3-i②] AI 剧集深度精讲服务（PRO 专属）。
 *
 * 挂墙理由：LLM 有真实边际成本（DeepSeek 按次计费）；免费层的获客面是
 * 剧集页既有内容（标题/介绍/文稿预览/基础摘要），深度精讲为 PRO 增量。
 *
 * 成本模型：每集只生成一次并落 episode_deep_dives 缓存表（episodeid 唯一），
 * 全部 PRO 用户共享——LLM 成本按剧集数封顶；同集并发未命中以剧集级
 * pg_advisory_xact_lock 串行化（M1 模式，后到者直接读缓存）。
 *
 * 产出（JSON mode，四模块）：
 *   vocabulary  难点词汇预扫（词/音标/释义/难点说明）
 *   sentences   长难句拆解（原句/结构分析/提示）
 *   shadowing   本集跟读句推荐（必须逐字取自字幕，白名单过滤）
 *   quiz        测验生成（题干/四选项/答案索引/解析）
 *
 * 防回归口径：LLM 产出一律不信任——shadowing 逐字校验字幕、quiz 答案索引
 * 越界剔除、各模块数量截断；生成失败返回错误码由前端降级提示，不阻断页面。
 */

import prisma from "@/lib/prisma";
import { isPremiumUser } from "@/core/auth/guard";
import { mergeSubtitles } from "@/lib/data";
import { generateSignatureUrl } from "@/lib/oss";
import { Episode } from "@/core/episode/episode.entity";

export interface DeepDiveVocabItem {
  word: string;
  phonetic?: string;
  meaning: string;
  reason?: string;
}
export interface DeepDiveSentenceItem {
  text: string;
  analysis: string;
}
export interface DeepDiveShadowingItem {
  text: string;
  reason?: string;
}
export interface DeepDiveQuizItem {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}
export interface DeepDiveContent {
  vocabulary: DeepDiveVocabItem[];
  sentences: DeepDiveSentenceItem[];
  shadowing: DeepDiveShadowingItem[];
  quiz: DeepDiveQuizItem[];
}

export interface DeepDiveResult {
  ok: boolean;
  code?:
    | "PREMIUM_REQUIRED"
    | "EPISODE_NOT_FOUND"
    | "NO_SUBTITLE"
    | "LLM_UNAVAILABLE";
  message?: string;
  content?: DeepDiveContent;
  cached?: boolean;
}

/** 字幕喂给 LLM 的字符上限（长集截断，保留开篇即可覆盖主题与难点） */
const SUBTITLE_CHAR_CAP = 8000;
const LLM_TIMEOUT_MS = 90_000;
const MAX_VOCAB = 8;
const MAX_SENTENCES = 4;
const MAX_SHADOWING = 5;
const MAX_QUIZ = 5;

const SYSTEM_PROMPT = `你是一位资深英语播客精讲教师。根据提供的剧集标题、简介与英文字幕，为中文母语学习者生成深度精讲内容。

输出严格为 JSON 对象，包含四个数组：
{
  "vocabulary": [{ "word": "剧中难点词", "phonetic": "音标", "meaning": "中文释义", "reason": "为什么难/易错点" }],
  "sentences": [{ "text": "字幕中的原句", "analysis": "中文拆解句子结构与语法难点" }],
  "shadowing": [{ "text": "字幕中的原句", "reason": "为什么值得跟读" }],
  "quiz": [{ "question": "中文提问（考查理解）", "options": ["四个选项"], "answer": 0, "explanation": "中文解析" }]
}
要求：
- vocabulary 5-8 个：选学习者真正会卡住的词（习语/搭配/多义词），不选基础词；
- sentences 2-4 句：挑最长最难的结构句，逐层拆解；
- shadowing 3-5 句：必须逐字取自字幕原文，优先选发音清晰、表达地道的短句；
- quiz 3-5 题：考查对本集内容的理解，answer 为正确选项的下标（0-3）；
- 全部中文说明，术语可保留英文。`;

async function callLlm(prompt: string): Promise<Partial<DeepDiveContent>> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const modelName = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
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
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
    }
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty LLM response");
    return JSON.parse(content) as Partial<DeepDiveContent>;
  } finally {
    clearTimeout(timer);
  }
}

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/** 白名单过滤 + 数量截断：LLM 产出不可信，逐字段校验 */
function sanitize(
  raw: Partial<DeepDiveContent>,
  subtitleTexts: string[],
): DeepDiveContent {
  const subtitleSet = new Set(
    subtitleTexts.map((t) => t.replace(/\s+/g, " ").trim().toLowerCase()),
  );

  const vocabulary: DeepDiveVocabItem[] = (
    Array.isArray(raw.vocabulary) ? raw.vocabulary : []
  )
    .map((v) => ({
      word: str((v as DeepDiveVocabItem).word, 60),
      phonetic: str((v as DeepDiveVocabItem).phonetic, 60) || undefined,
      meaning: str((v as DeepDiveVocabItem).meaning, 120),
      reason: str((v as DeepDiveVocabItem).reason, 160) || undefined,
    }))
    .filter((v) => v.word && v.meaning)
    .slice(0, MAX_VOCAB);

  const sentences: DeepDiveSentenceItem[] = (
    Array.isArray(raw.sentences) ? raw.sentences : []
  )
    .map((s) => ({
      text: str((s as DeepDiveSentenceItem).text, 400),
      analysis: str((s as DeepDiveSentenceItem).analysis, 500),
    }))
    .filter((s) => s.text && s.analysis)
    .slice(0, MAX_SENTENCES);

  // 跟读句必须逐字来自字幕（LLM 不得杜撰/改写——与练习定位的句子一致）
  const shadowing: DeepDiveShadowingItem[] = (
    Array.isArray(raw.shadowing) ? raw.shadowing : []
  )
    .map((s) => ({
      text: str((s as DeepDiveShadowingItem).text, 400),
      reason: str((s as DeepDiveShadowingItem).reason, 160) || undefined,
    }))
    .filter(
      (s) =>
        s.text &&
        subtitleSet.has(s.text.replace(/\s+/g, " ").trim().toLowerCase()),
    )
    .slice(0, MAX_SHADOWING);

  const quiz: DeepDiveQuizItem[] = (Array.isArray(raw.quiz) ? raw.quiz : [])
    .map((q) => {
      const item = q as DeepDiveQuizItem;
      const options = Array.isArray(item.options)
        ? item.options.map((o) => str(o, 200)).filter(Boolean)
        : [];
      const answer = Number.isInteger(item.answer)
        ? (item.answer as number)
        : -1;
      return {
        question: str(item.question, 300),
        options,
        answer,
        explanation: str(item.explanation, 300) || undefined,
      };
    })
    .filter(
      (q) =>
        q.question && q.options.length === 4 && q.answer >= 0 && q.answer < 4,
    )
    .slice(0, MAX_QUIZ);

  return { vocabulary, sentences, shadowing, quiz };
}

export const episodeDeepDiveService = {
  /**
   * 缓存探测：只查本集精讲是否已落库，绝不触发 LLM 生成。
   * 小程序首点分流 UI 用——cached=true 走安静加载，cached=false 才展示
   * "首次生成约需 30-60 秒"，避免缓存命中时该提示一闪而过。
   */
  async probeDeepDive(
    user: { role?: string | null; userid?: string },
    episodeid: string,
  ): Promise<{
    ok: boolean;
    code?: "PREMIUM_REQUIRED";
    message?: string;
    cached?: boolean;
  }> {
    if (!(await isPremiumUser(user))) {
      return {
        ok: false,
        code: "PREMIUM_REQUIRED",
        message: "AI 深度精讲是 PRO 会员专属",
      };
    }
    const row = await prisma.episode_deep_dives.findUnique({
      where: { episodeid },
      select: { episodeid: true },
    });
    return { ok: true, cached: !!row };
  },

  /**
   * 获取（或首次生成）剧集深度精讲。PRO 专属；同集缓存命中零 LLM 成本。
   */
  async getDeepDive(
    user: { role?: string | null; userid?: string },
    episodeid: string,
  ): Promise<DeepDiveResult> {
    if (!(await isPremiumUser(user))) {
      return {
        ok: false,
        code: "PREMIUM_REQUIRED",
        message: "AI 深度精讲是 PRO 会员专属",
      };
    }

    const episode = await prisma.episode.findUnique({
      where: { episodeid },
      select: { episodeid: true, title: true, description: true },
    });
    if (!episode) {
      return { ok: false, code: "EPISODE_NOT_FOUND", message: "剧集不存在" };
    }

    // 1. 缓存命中（绝大多数请求的路径）
    const cachedRow = await prisma.episode_deep_dives.findUnique({
      where: { episodeid },
    });
    if (cachedRow) {
      return {
        ok: true,
        content: cachedRow.content as unknown as DeepDiveContent,
        cached: true,
      };
    }

    // 2. 字幕素材（与练习/精听同一条 mergeSubtitles 管道；
    //    mergeSubtitles 直接 fetch URL，须先按 practice-data 同款签名）
    const full = await prisma.episode.findUnique({ where: { episodeid } });
    if (!full) {
      return { ok: false, code: "EPISODE_NOT_FOUND", message: "剧集不存在" };
    }
    const [signedBilingual, signedEn, signedZh] = await Promise.all([
      full.subtitleBilingualFileName
        ? generateSignatureUrl(full.subtitleBilingualFileName, 3600).catch(
            () => "",
          )
        : Promise.resolve(""),
      full.subtitleEnFileName
        ? generateSignatureUrl(full.subtitleEnFileName, 3600).catch(() => "")
        : Promise.resolve(""),
      full.subtitleZhFileName
        ? generateSignatureUrl(full.subtitleZhFileName, 3600).catch(() => "")
        : Promise.resolve(""),
    ]);
    const voiceEpisode = {
      ...full,
      subtitleBilingualUrl: signedBilingual || full.subtitleBilingualUrl || "",
      subtitleEnUrl: signedEn || full.subtitleEnUrl || "",
      subtitleZhUrl: signedZh || full.subtitleZhUrl || "",
    };
    const subtitles = await mergeSubtitles(voiceEpisode as unknown as Episode);
    if (!subtitles || subtitles.length === 0) {
      return {
        ok: false,
        code: "NO_SUBTITLE",
        message: "本集暂无字幕，无法生成精讲",
      };
    }

    let subtitleText = subtitles
      .map((s, i) => `${i + 1}. ${s.textEn}`)
      .join("\n");
    if (subtitleText.length > SUBTITLE_CHAR_CAP) {
      subtitleText = subtitleText.slice(0, SUBTITLE_CHAR_CAP);
    }

    // 3. LLM 生成（事务外调用，避免长事务占锁；落库前以剧集级咨询锁防并发双生成）
    let raw: Partial<DeepDiveContent>;
    try {
      raw = await callLlm(
        `<title>${episode.title}</title>\n<description>${episode.description || ""}</description>\n<subtitles>\n${subtitleText}\n</subtitles>`,
      );
    } catch (error) {
      console.error("[episode-deep-dive] LLM call failed:", error);
      return {
        ok: false,
        code: "LLM_UNAVAILABLE",
        message: "AI 精讲生成暂时不可用，请稍后重试",
      };
    }

    const subtitleTexts = subtitles.map((s) => s.textEn);
    const content = sanitize(raw, subtitleTexts);
    if (
      content.vocabulary.length === 0 &&
      content.sentences.length === 0 &&
      content.shadowing.length === 0 &&
      content.quiz.length === 0
    ) {
      return {
        ok: false,
        code: "LLM_UNAVAILABLE",
        message: "AI 精讲内容为空，请稍后重试",
      };
    }

    // 4. 落缓存：剧集级咨询锁内二次查缓存（并发未命中时后到者直接复用先到结果）
    const stored = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"deep_dive:" + episodeid}))`;
      const existing = await tx.episode_deep_dives.findUnique({
        where: { episodeid },
      });
      if (existing) return existing.content as unknown as DeepDiveContent;
      await tx.episode_deep_dives.create({
        data: { episodeid, content: content as unknown as object },
      });
      return content;
    });

    return { ok: true, content: stored, cached: false };
  },
};
