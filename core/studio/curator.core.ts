// yuanlu/core/studio/curator.core.ts

/**
 * [RESHAPE T1.4] 隐形策展纯逻辑（零依赖，供 studio 服务与单测直用）。
 *
 * 「心愿定制工坊」管线 = 意图解构（LLM）→ 语料多路召回（本文件的
 * where 构造）→ 精选编排（LLM，白名单过滤）→ 卡册装配。
 * 「今日五分钟处方」= 双螺旋装配（本文件的 assemblePrescription）。
 */

export interface RecallParams {
  keywordsEn: string[];
  keywordsZh: string[];
  /** 薄弱音素（如 θ）——召回 phonemeTags 含该音素的切片 */
  phoneme?: string | null;
  /** CEFR 目标档（含相邻档放宽） */
  cefrLevels?: string[] | null;
  /** 待复习生词（融合进英文关键词召回） */
  dueVocabWords?: string[];
}

/** CEFR 相邻档（与 weapp home 推荐口径一致） */
export const CEFR_NEIGHBORS: Record<string, string[]> = {
  A1: ["A1", "A2"],
  A2: ["A2", "B1"],
  B1: ["B1", "B2"],
  B2: ["B2", "C1"],
  C1: ["C1", "C2"],
  C2: ["C2"],
};

/** 关键词清洗：去标点/压空白/截 40 字，丢弃空项与超短词（单字母噪音） */
export function sanitizeKeywords(list: unknown, max = 8): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const kw = raw
      .toLowerCase()
      .replace(/[.,!?;:"'()\-—]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40);
    if (kw.length >= 2 && !out.includes(kw)) out.push(kw);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * [活体词典] 词边界精筛：SQL contains 是子串匹配（查 art 会命中 start），
 * 候选行在 JS 侧用 \b 词边界复检（大小写不敏感，正则元字符转义）。
 */
export function refineWordExamples<T extends { enText?: string | null }>(
  word: string,
  candidates: T[],
  limit: number,
): T[] {
  const w = (word || "").trim();
  if (!w || !Array.isArray(candidates)) return [];
  const re = new RegExp(
    `\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    "i",
  );
  const out: T[] = [];
  for (const c of candidates) {
    if (re.test(c.enText || "")) out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * [语义检索] 结果精选：优先不同剧集（每集最多 2 条），单词量少优先，
 * 输出按句长（词数）升序——供 /api/scenes/semantic-search 组装 3-5 条高质量结果。
 */
export function pickSemanticClips<
  T extends { clipid: string; episodeid: string; enText: string },
>(candidates: T[], limit: number): T[] {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  const wordCount = (s: string) =>
    (String(s || "").match(/[A-Za-z][A-Za-z'’-]*/g) || []).length;
  const sorted = candidates
    .filter((c) => c && c.clipid && c.enText)
    .sort((a, b) => wordCount(a.enText) - wordCount(b.enText));
  const perEpisode = new Map<string, number>();
  const uniqueRound: T[] = [];
  const secondRound: T[] = [];
  for (const c of sorted) {
    const n = perEpisode.get(c.episodeid) || 0;
    if (n === 0) uniqueRound.push(c);
    else if (n === 1) secondRound.push(c);
    else continue;
    perEpisode.set(c.episodeid, n + 1);
  }
  const picked = (
    uniqueRound.length >= limit ? uniqueRound : uniqueRound.concat(secondRound)
  ).slice(0, limit);
  return picked.sort((a, b) => wordCount(a.enText) - wordCount(b.enText));
}

/* ═══════════ [语义检索质量] 语料质量门禁 + 相关性排序（2026-11-05） ═══════════
 *
 * 线上实测：纯召回 + 「句长升序」精选会把 "Bought, saw, call, automatic."
 * 这类碎句与 check in a good dictionary 这类字面命中推到首位。以下两个纯函数
 * 供 /api/scenes/semantic-search 在 JS 复检阶段使用：
 *   1. isJunkClip：语料质量门禁（词数/功能词/时长/语速），碎句直接出局；
 *   2. rankSemanticClips：相关性打分精选，替代「最短优先」。
 */

/** 功能词样本：自然句几乎必含其一；全缺 → 词表式碎句（如 "Bought, saw, call, automatic."） */
const FUNCTION_WORDS = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "with",
  "and",
  "or",
  "but",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "i",
  "you",
  "we",
  "they",
  "he",
  "she",
  "my",
  "your",
  "our",
  "their",
  "his",
  "her",
  "me",
  "him",
  "them",
  "as",
  "if",
  "so",
  "not",
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
  "will",
  "would",
  "can",
  "could",
  "there",
  "what",
  "when",
  "how",
  "who",
  "than",
  "then",
  "just",
  "about",
  "from",
]);

export interface JunkGateOptions {
  /** 最少词数（默认 5：4 词门挡不住碎句） */
  minWords?: number;
  /** 最短时长秒（默认 3） */
  minDurationSec?: number;
  /** 最长时长秒（默认 40） */
  maxDurationSec?: number;
  /** 语速合理区间（默认 [90, 240]） */
  wpmRange?: [number, number];
}

/** 语料质量门禁：词表式碎句 / 过短过长 / 语速异常 → true（应剔除） */
export function isJunkClip(
  c: {
    enText?: string | null;
    wordCount?: number | null;
    duration?: number | null;
    wpm?: number | null;
  },
  options?: JunkGateOptions,
): boolean {
  const minWords = options?.minWords ?? 5;
  const minDur = options?.minDurationSec ?? 3;
  const maxDur = options?.maxDurationSec ?? 40;
  const [wpmLo, wpmHi] = options?.wpmRange ?? [90, 240];
  const words =
    String(c.enText || "")
      .toLowerCase()
      .match(/[a-z][a-z'’-]*/g) || [];
  if (words.length < minWords) return true;
  if (!words.some((w) => FUNCTION_WORDS.has(w))) return true;
  const dur = Number(c.duration);
  if (Number.isFinite(dur) && (dur < minDur || dur > maxDur)) return true;
  const wpm = Number(c.wpm);
  if (Number.isFinite(wpm) && wpm > 0 && (wpm < wpmLo || wpm > wpmHi))
    return true;
  return false;
}

export interface SemanticRankContext {
  /** DeepSeek 扩词（完整词块，小写） */
  phrases: string[];
  /** 每个词块的核心内容词（去停用词；与 phrases 平行数组） */
  perPhraseWords: string[][];
  /** 原始查询（中文意图或英文词句） */
  query: string;
  /** 中文 2 字滑窗（无中文查询为空数组） */
  grams: string[];
  /** 每集配额（默认 2） */
  perEpisodeCap?: number;
}

/** 相关性打分（分值仅用于排序，语义见 rankSemanticClips 注释） */
export function scoreSemanticClip(
  c: { enText?: string | null; zhText?: string | null; wpm?: number | null },
  ctx: SemanticRankContext,
): number {
  const en = String(c.enText || "").toLowerCase();
  const zh = String(c.zhText || "");
  if (!en) return -Infinity;
  const words = en.match(/[a-z][a-z'’-]*/g) || [];
  const phraseHit = (p: string) =>
    new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(en);
  const wordHit = (w: string) =>
    new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(en);

  let score = 0;
  // L1 证据：完整词块命中（+40/块，去重）——最强英文信号
  const hitPhrases = new Set(ctx.phrases.filter(phraseHit));
  score += hitPhrases.size * 40;
  // L2 证据：跨词块核心词共现（+12/词，去重，≥5 字符才算强）
  const strongWords = new Set<string>();
  ctx.perPhraseWords.forEach((ws) =>
    ws.forEach((w) => {
      if (w.length >= 5 && wordHit(w)) strongWords.add(w);
    }),
  );
  score += strongWords.size * 12;
  // L1' 证据：中文译文含完整查询（+25）——语义对齐最强的信号
  if (ctx.query && zh.includes(ctx.query)) score += 25;
  // L3 证据：中文滑窗（+6/窗，去重）
  score += new Set(ctx.grams.filter((g) => zh.includes(g))).size * 6;
  // 句长塑形：6–18 词的自然句 +10；>30 词独白 -15（旧「最短优先」的反向修正）
  if (words.length >= 6 && words.length <= 18) score += 10;
  else if (words.length > 30) score -= 15;
  // 语速清晰度：90–200 wpm +5；异常快 -8
  const wpm = Number(c.wpm);
  if (Number.isFinite(wpm) && wpm > 0) {
    if (wpm >= 90 && wpm <= 200) score += 5;
    else if (wpm > 240) score -= 8;
  }
  return score;
}

/**
 * [语义检索] 相关性排序精选：打分降序 + 每集配额（默认 2）+ 同分慢速优先
 * （发音更清晰）。取代 pickSemanticClips 的「句长升序」（碎句云集根因）。
 */
export function rankSemanticClips<
  T extends {
    clipid: string;
    episodeid: string;
    enText: string;
    zhText?: string | null;
    wpm?: number | null;
  },
>(candidates: T[], limit: number, ctx: SemanticRankContext): T[] {
  if (!Array.isArray(candidates) || candidates.length === 0 || limit <= 0)
    return [];
  const cap = ctx.perEpisodeCap ?? 2;
  const scored = candidates
    .filter((c) => c && c.clipid && c.enText)
    .map((c) => ({ c, s: scoreSemanticClip(c, ctx) }))
    .filter((x) => Number.isFinite(x.s))
    .sort((a, b) => {
      if (b.s !== a.s) return b.s - a.s;
      return (Number(a.c.wpm) || 999) - (Number(b.c.wpm) || 999);
    });
  const perEpisode = new Map<string, number>();
  const picked: T[] = [];
  for (const { c } of scored) {
    const n = perEpisode.get(c.episodeid) || 0;
    if (n >= cap) continue;
    perEpisode.set(c.episodeid, n + 1);
    picked.push(c);
    if (picked.length >= limit) break;
  }
  return picked;
}

export interface RecallWhere {
  OR: Array<
    | { enText: { contains: string; mode: "insensitive" } }
    | { zhText: { contains: string; mode: "insensitive" } }
    | { phonemeTags: { has: string } }
  >;
  cefrLevel?: { in: string[] };
}

/**
 * 多路召回 where：英文词项 / 中文译文 / 音素标签任一命中；
 * cefrLevels 给定时收紧难度（相邻档放宽口径由调用方算好传入）。
 * 全部关键词为空时返回 null（调用方走兜底召回：按难度任意切片）。
 */
export function buildRecallWhere(params: RecallParams): RecallWhere | null {
  const enWords = [
    ...sanitizeKeywords(params.keywordsEn),
    ...(params.dueVocabWords || []),
  ];
  const zhWords = sanitizeKeywords(params.keywordsZh);
  const OR: RecallWhere["OR"] = [];
  for (const kw of enWords)
    OR.push({ enText: { contains: kw, mode: "insensitive" } });
  for (const kw of zhWords)
    OR.push({ zhText: { contains: kw, mode: "insensitive" } });
  if (params.phoneme) OR.push({ phonemeTags: { has: params.phoneme } });

  if (OR.length === 0) return null;
  const where: RecallWhere = { OR };
  if (params.cefrLevels && params.cefrLevels.length > 0) {
    where.cefrLevel = { in: params.cefrLevels };
  }
  return where;
}

export interface CuratorIntent {
  intentSummary: string;
  searchKeywordsEn: string[];
  searchKeywordsZh: string[];
  grammarPatterns: string[];
  targetCefr: string | null;
  moodTone: string;
  curatorIntro: string;
}

/** LLM 意图解构产物清洗（产出一律不信任：类型/长度全量校验） */
export function sanitizeIntent(raw: unknown): CuratorIntent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  const intent = {
    intentSummary: str(r.intentSummary, 200),
    searchKeywordsEn: sanitizeKeywords(r.searchKeywordsEn),
    searchKeywordsZh: sanitizeKeywords(r.searchKeywordsZh),
    grammarPatterns: sanitizeKeywords(r.grammarPatterns),
    targetCefr: (() => {
      const c = str(r.targetCefr, 4).toUpperCase();
      return CEFR_NEIGHBORS[c] ? c : null;
    })(),
    moodTone: str(r.moodTone, 30),
    curatorIntro: str(r.curatorIntro, 300),
  };
  if (
    !intent.intentSummary &&
    intent.searchKeywordsEn.length === 0 &&
    intent.searchKeywordsZh.length === 0
  ) {
    return null;
  }
  return intent;
}

export interface CuratedCardDraft {
  clipid: string;
  note: string;
  question: string;
}

/** LLM 精选清洗：clipid 白名单过滤 + 去重 + 截断，批注/题目截长 */
export function sanitizeCuration(
  raw: unknown,
  validClipIds: Set<string>,
  maxCards = 6,
): CuratedCardDraft[] {
  if (!Array.isArray(raw)) return [];
  const out: CuratedCardDraft[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (
      typeof r.clipid !== "string" ||
      !validClipIds.has(r.clipid) ||
      seen.has(r.clipid)
    )
      continue;
    seen.add(r.clipid);
    out.push({
      clipid: r.clipid,
      note: typeof r.note === "string" ? r.note.trim().slice(0, 300) : "",
      question:
        typeof r.question === "string" ? r.question.trim().slice(0, 200) : "",
    });
    if (out.length >= maxCards) break;
  }
  return out;
}

// ==================== 今日五分钟双螺旋处方 ====================

export interface PhonemeStatValue {
  score?: number;
  avg?: number;
  average?: number;
  errorCount?: number;
  count?: number;
}

/**
 * 音素画像弱项解析（tolerant：兼容 Record<音素, {avg|score|average}> 与
 * { phonemes: [...] } 两种历史形态），按均分升序取前 N。
 * 均分缺失但有 errorCount 的按 0 分处理（错得多即弱）。
 */
export function topWeakPhonemes(phonemeStats: unknown, n = 2): string[] {
  if (!phonemeStats) return [];
  let entries: Array<[string, PhonemeStatValue]> = [];

  if (Array.isArray(phonemeStats)) {
    entries = phonemeStats
      .filter((p) => p && typeof p === "object")
      .map((p) => {
        const r = p as Record<string, unknown>;
        const name =
          typeof r.phoneme === "string"
            ? r.phoneme
            : typeof r.name === "string"
              ? r.name
              : "";
        return [name, r as PhonemeStatValue] as [string, PhonemeStatValue];
      })
      .filter(([name]) => !!name);
  } else if (typeof phonemeStats === "object") {
    const root = phonemeStats as Record<string, unknown>;
    const source =
      (root.phonemes && Array.isArray(root.phonemes) ? root.phonemes : null) ||
      root;
    if (Array.isArray(source)) {
      entries = (source as Array<Record<string, unknown>>)
        .filter((p) => p && typeof p === "object")
        .map((p) => {
          const name =
            typeof p.phoneme === "string"
              ? p.phoneme
              : typeof p.name === "string"
                ? p.name
                : "";
          return [name, p as PhonemeStatValue] as [string, PhonemeStatValue];
        })
        .filter(([name]) => !!name);
    } else {
      entries = Object.entries(
        source as Record<string, PhonemeStatValue>,
      ).filter(([k]) => k.length > 0 && k.length <= 5);
    }
  }

  return entries
    .map(([name, v]) => {
      const avg =
        typeof v.avg === "number"
          ? v.avg
          : typeof v.score === "number"
            ? v.score
            : typeof v.average === "number"
              ? v.average
              : (v.errorCount ?? 0) > 0
                ? 0
                : Number.NaN;
      return { name, avg };
    })
    .filter((e) => Number.isFinite(e.avg) && e.avg < 90)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, n)
    .map((e) => e.name);
}

export interface PrescriptionClipCard {
  type: "vocab_revival" | "weak_phoneme";
  /** vocab_revival：命中的生词；weak_phoneme：目标音素 */
  focus: string;
  clipid: string;
  episodeid: string;
  enText: string;
  zhText: string | null;
  startTime: number;
  endTime: number;
  duration: number;
  wpm: number;
  cefrLevel: string | null;
  coverUrl: string | null;
  sourceLabel: string | null;
  /** 生词在句中的高亮区间建议 [startIndex, endIndex) */
  focusRange: [number, number] | null;
}

export interface PrescriptionSceneCard {
  type: "micro_scene";
  sceneid: string;
  title: string;
  situationTag: string | null;
  cefrLevel: string | null;
  coverUrl: string | null;
  duration: number;
  summaryZh: string | null;
}

export type PrescriptionCard = PrescriptionClipCard | PrescriptionSceneCard;

export interface PrescriptionInputs {
  dueVocab: Array<{ word: string; episodeid: string | null }>;
  clipsByWord: Record<
    string,
    Array<Omit<PrescriptionClipCard, "type" | "focus" | "focusRange">>
  >;
  weakPhonemes: string[];
  clipsByPhoneme: Record<
    string,
    Array<Omit<PrescriptionClipCard, "type" | "focus" | "focusRange">>
  >;
  scene: Omit<PrescriptionSceneCard, "type"> | null;
}

/** 生词在句文本中的不区分大小写高亮区间 */
export function locateFocusRange(
  word: string,
  enText: string,
): [number, number] | null {
  if (!word) return null;
  const idx = enText.toLowerCase().indexOf(word.toLowerCase());
  return idx >= 0 ? [idx, idx + word.length] : null;
}

/**
 * 双螺旋装配（第 1–2 卡跨语境生词重逢 / 第 3–4 卡弱音靶向 / 第 5 卡微剧场）。
 * 任一池为空时该类卡片缺位（不硬凑）；卡片不足 3 张时返回 partial 标记，
 * 由调用方决定兜底（如以任意难度匹配切片补足）。
 */
export function assemblePrescription(inputs: PrescriptionInputs): {
  cards: PrescriptionCard[];
  partial: boolean;
} {
  const cards: PrescriptionCard[] = [];

  for (const vocab of inputs.dueVocab.slice(0, 2)) {
    const pool = inputs.clipsByWord[vocab.word] || [];
    const clip = pool[0];
    if (!clip) continue;
    cards.push({
      ...clip,
      type: "vocab_revival",
      focus: vocab.word,
      focusRange: locateFocusRange(vocab.word, clip.enText),
    });
  }

  for (const phoneme of inputs.weakPhonemes.slice(0, 2)) {
    const pool = inputs.clipsByPhoneme[phoneme] || [];
    const clip = pool[0];
    if (!clip) continue;
    cards.push({
      ...clip,
      type: "weak_phoneme",
      focus: phoneme,
      focusRange: null,
    });
  }

  if (inputs.scene) cards.push({ ...inputs.scene, type: "micro_scene" });

  return { cards, partial: cards.length < 3 };
}
