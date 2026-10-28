// yuanlu/core/corpus/clip-core.ts

/**
 * [RESHAPE T1.2] 语料原子化纯逻辑核心（零依赖，供批处理脚本与单测直用）。
 *
 * 输入 = OSS 双语词级时间戳字幕（mergeSubtitles 同款 JSON）：
 *   [{ id, start, end, speaker?, textEn, textCn, words: [{word, start, end}] }]
 *
 * 产出 = corpus_clips 行草稿 + micro_scenes 聚组草稿：
 *   1. buildClipsFromSubtitles：过滤过短/纯语气词碎句，计算每句真实语速
 *      WPM、⚡连读吞音词块（功能词 <130ms 且相邻间隙 <20ms）、音素标签；
 *   2. groupScenes：相邻 3–6 句聚合为 15–40s 微剧场（时间间隙 >8s 断组）；
 *   3. mapDeepDiveIntoScenes：既有 episode_deep_dives 内容按文本命中
 *      映射进各窗口（零 Token 复用为语境精析卡）。
 *
 * 口径与小程序端 utils/intensive-core.js 的 analyzeWordAcoustics 对齐
 * （同阈值同算法，双端行为不分叉）。
 */

/** 功能词表（虚词/助动词/代词/介词——母语者口语中被极速压缩的高频词） */
const FUNCTION_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "nor",
  "so",
  "yet",
  "of",
  "to",
  "in",
  "on",
  "at",
  "for",
  "with",
  "from",
  "by",
  "up",
  "out",
  "off",
  "outta",
  "into",
  "about",
  "over",
  "under",
  "that",
  "this",
  "these",
  "those",
  "there",
  "here",
  "than",
  "then",
  "is",
  "am",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "do",
  "does",
  "did",
  "done",
  "has",
  "have",
  "had",
  "will",
  "would",
  "can",
  "could",
  "should",
  "shall",
  "may",
  "might",
  "must",
  "not",
  "no",
  "don't",
  "doesn't",
  "didn't",
  "won't",
  "can't",
  "couldn't",
  "wouldn't",
  "shouldn't",
  "isn't",
  "wasn't",
  "aren't",
  "weren't",
  "hasn't",
  "haven't",
  "hadn't",
  "it",
  "its",
  "he",
  "him",
  "his",
  "she",
  "her",
  "we",
  "us",
  "our",
  "they",
  "them",
  "their",
  "you",
  "your",
  "i",
  "me",
  "my",
  "what",
  "which",
  "who",
  "whom",
  "whose",
  "how",
  "when",
  "where",
  "why",
  "all",
  "any",
  "both",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "just",
  "only",
  "very",
  "too",
  "got",
  "get",
  "gonna",
  "wanna",
  "gotta",
  "kind",
  "sort",
  "lot",
  "bit",
  "going",
  "want",
  "because",
  "as",
  "if",
]);

/** 极速词阈值（毫秒）：低于此值的功能词视作被母语者"吞掉" */
export const FAST_LINK_MS = 130;
/** 连读间隙阈值（毫秒）：相邻极速词间隙小于此值才并块 */
export const FAST_LINK_GAP_MS = 20;

export interface TimedWord {
  word?: string;
  start?: number;
  end?: number;
}

export interface SubtitleItem {
  id: number;
  start: number;
  end?: number | null;
  speaker?: string | null;
  textEn: string;
  textCn?: string | null;
  words?: TimedWord[];
}

export interface FastLinkBlock {
  startIdx: number;
  endIdx: number;
  text: string;
  durationSec: number;
}

export interface ClipAcoustics {
  wpm: number;
  fastLinks: FastLinkBlock[];
}

function cleanWordToken(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[.,!?;:"'’()]/g, "");
}

export function isFunctionWord(word: string | undefined): boolean {
  return FUNCTION_WORDS.has(cleanWordToken(word || ""));
}

/** 有效词（时间戳完整的实条目）——脏数据（缺 start/end/end<start）一律剔除 */
export function validWords(words: TimedWord[] | undefined | null): TimedWord[] {
  return (words || []).filter(
    (w) =>
      w &&
      typeof w.start === "number" &&
      typeof w.end === "number" &&
      isFinite(w.start) &&
      isFinite(w.end) &&
      (w.end as number) >= (w.start as number),
  );
}

/** 句真实语速：词数 /（首词起 ~ 末词止）；无有效词按句级窗口兜底 */
export function computeClipWpm(
  words: TimedWord[],
  sentenceStart: number,
  sentenceEnd: number,
): number {
  if (words.length === 0) {
    const span = sentenceEnd - sentenceStart;
    return span > 0 ? Math.round(1 / (span / 60)) : 0;
  }
  const first = words[0].start as number;
  const last = words[words.length - 1].end as number;
  const span = last - first;
  return span > 0 ? Math.round(words.length / (span / 60)) : 0;
}

/**
 * ⚡连读吞音词块检测：功能词且 <130ms；块内相邻词间隙 <20ms 才并块、
 * 间隙过大拆块（与小程序端 intensive-core.analyzeWordAcoustics 同口径）。
 */
export function detectFastLinks(words: TimedWord[]): FastLinkBlock[] {
  const blocks: FastLinkBlock[] = [];
  let blockStart = -1;

  const flush = (endIdx: number) => {
    if (blockStart < 0 || endIdx < blockStart) return;
    const text = words
      .slice(blockStart, endIdx + 1)
      .map((w) => w.word || "")
      .join(" ")
      .trim();
    if (text) {
      blocks.push({
        startIdx: blockStart,
        endIdx,
        text,
        durationSec:
          Math.round(
            ((words[endIdx].end as number) -
              (words[blockStart].start as number)) *
              100,
          ) / 100,
      });
    }
    blockStart = -1;
  };

  words.forEach((w, i) => {
    const durationMs = ((w.end as number) - (w.start as number)) * 1000;
    const gapMs =
      i > 0
        ? Math.max(
            0,
            ((w.start as number) - (words[i - 1].end as number)) * 1000,
          )
        : 0;
    const qualifies =
      isFunctionWord(w.word) && durationMs > 0 && durationMs < FAST_LINK_MS;
    if (qualifies) {
      if (blockStart < 0 || gapMs >= FAST_LINK_GAP_MS) {
        flush(i - 1); // 间隙过大：前块收口，本词开新块
        blockStart = i;
      }
    } else {
      flush(i - 1);
    }
  });
  flush(words.length - 1);
  return blocks;
}

export function analyzeAcousticFlags(
  words: TimedWord[],
  sentenceStart: number,
  sentenceEnd: number,
): ClipAcoustics {
  return {
    wpm: computeClipWpm(words, sentenceStart, sentenceEnd),
    fastLinks: detectFastLinks(words),
  };
}

/**
 * 音素标签启发式提取（弱音靶向召回用，非精确音标）：
 * θ←th、v←v、w←w/wh、r←r、l←l、ŋ←-ing 结尾。
 */
export function phonemeTagsFromText(enText: string): string[] {
  const t = String(enText || "").toLowerCase();
  const tags: string[] = [];
  if (/\bth/.test(t)) tags.push("θ");
  if (/\bv/.test(t)) tags.push("v");
  if (/\b(wh|w)/.test(t)) tags.push("w");
  if (/\br/.test(t)) tags.push("r");
  if (/\bl/.test(t)) tags.push("l");
  if (/ing\b/.test(t)) tags.push("ŋ");
  return tags;
}

const INTERJECTION_ONLY =
  /^(yeah|yep|yes|nope|ok|okay|sure|right|exactly|wow|whoa|oh+|ah+|um+|uh+|er+|hmm+|mhm|mm+|huh|nah|hey|hi|hello|thanks|thank you|goodbye|bye|welcome|sorry|please)[.,!?~\s]*$/i;

/** 纯语气词/应答碎句（教学价值低，不入语料库） */
export function isInterstitialSentence(
  enText: string,
  wordCount: number,
): boolean {
  if (wordCount > 0 && wordCount < 4) return true;
  const t = String(enText || "").trim();
  return t.length > 0 && t.length <= 30 && INTERJECTION_ONLY.test(t);
}

export interface BuildClipsOptions {
  /** 单句最短时长（秒），低于视为碎句 */
  minDurationSec?: number;
  /** 单句最少有效词数 */
  minWords?: number;
}

export interface ClipDraft {
  episodeid: string;
  subtitleId: number;
  startTime: number;
  endTime: number;
  duration: number;
  enText: string;
  zhText: string | null;
  speaker: string | null;
  wordsJson: TimedWord[] | null;
  wpm: number;
  acousticFlags: { fastLinks: FastLinkBlock[] } | null;
  phonemeTags: string[];
  wordCount: number;
}

/**
 * 字幕 JSON → corpus_clips 行草稿（过滤 + 声学指纹）。
 * end 缺失按 start+3s 兜底（与 Web computeWindow 口径一致）。
 */
export function buildClipsFromSubtitles(
  episodeid: string,
  subtitles: SubtitleItem[],
  options?: BuildClipsOptions,
): ClipDraft[] {
  const minDurationSec = options?.minDurationSec ?? 2.5;
  const minWords = options?.minWords ?? 4;

  const drafts: ClipDraft[] = [];
  for (const sub of subtitles || []) {
    if (typeof sub.id !== "number" || typeof sub.start !== "number") continue;
    const end =
      typeof sub.end === "number" && sub.end >= sub.start
        ? sub.end
        : sub.start + 3;
    const words = validWords(sub.words);
    const enText = String(sub.textEn || "").trim();
    if (!enText) continue;
    const duration = end - sub.start;
    if (duration < minDurationSec) continue;
    if (words.length < minWords) continue;
    if (isInterstitialSentence(enText, words.length)) continue;

    const acoustics = analyzeAcousticFlags(words, sub.start, end);
    drafts.push({
      episodeid,
      subtitleId: sub.id,
      startTime: sub.start,
      endTime: end,
      duration: Math.round(duration * 1000) / 1000,
      enText,
      zhText: sub.textCn ? String(sub.textCn).trim() || null : null,
      speaker: sub.speaker ? String(sub.speaker) : null,
      wordsJson: words.length > 0 ? words : null,
      wpm: acoustics.wpm,
      acousticFlags:
        acoustics.fastLinks.length > 0
          ? { fastLinks: acoustics.fastLinks }
          : null,
      phonemeTags: phonemeTagsFromText(enText),
      wordCount: words.length,
    });
  }
  return drafts;
}

export interface SceneClipRef {
  /** 落库后回填的切片 cuid（聚合阶段可为空，写入脚本按 subtitleId 对账） */
  clipid?: string;
  subtitleId: number;
  start: number;
  end: number;
  textEn: string;
  textCn: string | null;
  speaker: string | null;
  words: TimedWord[];
}

export interface SceneDraft {
  episodeid: string;
  title: string;
  summaryZh: string | null;
  startTime: number;
  endTime: number;
  duration: number;
  clips: SceneClipRef[];
}

export interface GroupScenesOptions {
  minClips?: number;
  maxClips?: number;
  minTotalSec?: number;
  maxTotalSec?: number;
  /** 相邻句间隙超过该值断组（自然段落边界） */
  gapSec?: number;
}

/**
 * 相邻句聚合为微剧场：按 subtitleId 升序（即时间序）扫描，约束
 * [minClips, maxClips] 句 / 总时长 [minTotalSec, maxTotalSec]，
 * 句间隙 > gapSec 强制断组。时长不足 minTotalSec 时允许组到 maxClips 句
 * 仍不足则放弃该组（并入条件的组保持连续性，不跨大间隙拉句）。
 */
export function groupScenes(
  episodeid: string,
  clips: ClipDraft[],
  options?: GroupScenesOptions,
): SceneDraft[] {
  const minClips = options?.minClips ?? 3;
  const maxClips = options?.maxClips ?? 6;
  const minTotalSec = options?.minTotalSec ?? 15;
  const maxTotalSec = options?.maxTotalSec ?? 40;
  const gapSec = options?.gapSec ?? 8;

  const sorted = [...clips].sort((a, b) => a.subtitleId - b.subtitleId);
  const scenes: SceneDraft[] = [];
  let bucket: ClipDraft[] = [];

  const closeBucket = () => {
    if (bucket.length >= minClips) {
      const start = bucket[0].startTime;
      const end = bucket[bucket.length - 1].endTime;
      const duration = Math.round((end - start) * 1000) / 1000;
      // 时长不足下限时尽量并入下一组（由调用侧重新聚合），此处只保留合规组
      if (duration <= maxTotalSec) {
        const firstZh = bucket
          .map((c) => c.zhText)
          .find((z) => z && z.length >= 6);
        scenes.push({
          episodeid,
          title: (firstZh || bucket[0].enText).slice(0, 30),
          summaryZh: null,
          startTime: start,
          endTime: end,
          duration,
          clips: bucket.map((c) => ({
            clipid: undefined,
            subtitleId: c.subtitleId,
            start: c.startTime,
            end: c.endTime,
            textEn: c.enText,
            textCn: c.zhText,
            speaker: c.speaker,
            words: (c.wordsJson || []) as TimedWord[],
          })),
        });
      }
    }
    bucket = [];
  };

  for (const clip of sorted) {
    if (bucket.length === 0) {
      bucket.push(clip);
      continue;
    }
    const prev = bucket[bucket.length - 1];
    const gap = clip.startTime - prev.endTime;
    const span = clip.endTime - bucket[0].startTime;
    const wouldExceed = bucket.length >= maxClips || span > maxTotalSec;
    if (gap > gapSec || wouldExceed) {
      closeBucket();
      bucket.push(clip);
    } else {
      bucket.push(clip);
      // 达到时长上限即收口（不硬凑 maxClips）
      if (clip.endTime - bucket[0].startTime >= maxTotalSec) closeBucket();
    }
  }
  closeBucket();

  // 二次缝合：时长不足 minTotalSec 的相邻组合并（不跨 gap 断组已保证相邻性，
  // 合并后仍超上限则保留原样丢弃短组）
  const merged: SceneDraft[] = [];
  for (const scene of scenes) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      scene.startTime - prev.endTime <= gapSec &&
      prev.duration < minTotalSec &&
      prev.clips.length + scene.clips.length <= maxClips &&
      scene.endTime - prev.startTime <= maxTotalSec
    ) {
      prev.clips.push(...scene.clips);
      prev.endTime = scene.endTime;
      prev.duration = Math.round((prev.endTime - prev.startTime) * 1000) / 1000;
    } else {
      merged.push(scene);
    }
  }
  return merged.filter(
    (s) => s.duration >= minTotalSec * 0.6 && s.clips.length >= minClips,
  );
}

export interface DeepDiveContent {
  vocabulary?: Array<{
    word?: string;
    phonetic?: string;
    meaning?: string;
    reason?: string;
  }>;
  sentences?: Array<{ text?: string; analysis?: string }>;
  shadowing?: Array<{ text?: string; reason?: string }>;
  quiz?: Array<{
    question?: string;
    options?: string[];
    answerIndex?: number;
    explanation?: string;
  }>;
}

export interface SceneDeepDive {
  vocabulary: NonNullable<DeepDiveContent["vocabulary"]>;
  sentences: NonNullable<DeepDiveContent["sentences"]>;
  quiz: NonNullable<DeepDiveContent["quiz"]>;
}

function normalizeForMatch(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[.,!?;:"'’“”()\-—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 既有 episode_deep_dives 内容 → 按文本命中映射进各微剧场窗口：
 *   vocabulary：word 出现在窗口任一句；
 *   sentences：原句归一化后被窗口任一句包含（或反向包含）；
 *   quiz：全量跟随所在窗口（题目文本命中同 sentences，未命中挂首窗口）。
 */
export function mapDeepDiveIntoScenes(
  scenes: SceneDraft[],
  deepDive: DeepDiveContent | null | undefined,
): Array<SceneDeepDive | null> {
  if (!deepDive) return scenes.map(() => null);

  return scenes.map((scene) => {
    const corpus = scene.clips
      .map((c) => normalizeForMatch(c.textEn))
      .filter(Boolean);
    const hit = (text: string) =>
      corpus.some(
        (c) =>
          c.includes(normalizeForMatch(text)) ||
          normalizeForMatch(text).includes(c),
      );

    const vocabulary = (deepDive.vocabulary || []).filter((v) =>
      scene.clips.some((c) =>
        normalizeForMatch(c.textEn).includes(normalizeForMatch(v.word || "")),
      ),
    );
    const sentences = (deepDive.sentences || []).filter(
      (s) => s.text && hit(s.text),
    );
    const quiz = (deepDive.quiz || []).filter(
      (q) => !q.question || hit(q.question.replace(/^[0-9]+\.\s*/, "")),
    );

    if (vocabulary.length === 0 && sentences.length === 0 && quiz.length === 0)
      return null;
    return { vocabulary, sentences, quiz };
  });
}
