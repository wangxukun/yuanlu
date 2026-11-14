import { createHash, createHmac } from "node:crypto";
import { hasSensitiveTerm, type TimedWord } from "@/core/corpus/clip-core";
import { isJunkClip } from "@/core/studio/curator.core";

export const DAILY_VERSION = "daily-v1";
export const DAILY_SIZE = 5;
export const WINDOW_SIZE = 128;
export const MAX_WINDOWS = 12;
const DAY_MS = 86400000;

export type Sentence = { episodeid: string; subtitleId: number };
export type HistoryItem = Sentence & {
  servedOn?: string;
  practicedOn?: string;
};
export type DailyInput = {
  anonymousId?: string;
  localHistory: HistoryItem[];
  levels: string[];
};
export type DailyClip = Sentence & {
  clipid: string;
  enText: string;
  zhText: string | null;
  wordsJson: unknown;
  startTime: number;
  endTime: number;
  duration: number;
  wpm: number;
  cefrLevel: string | null;
  topicTags: string[];
  worthyScore: number | null;
  sourceLabel: string | null;
  coverUrl: string | null;
  lastPracticedOn?: string;
  isExclusive?: boolean;
};
export type SelectionItem = Sentence & {
  slot: number;
  clipid: string;
  textHash: string;
  matchedWords: string[];
  selectionReason: "vocabulary" | "explore" | "cooldown_reuse";
};
export type Selection = {
  items: SelectionItem[];
  status: "complete" | "partial" | "empty";
  fallbackStage: string;
};

export function chinaDate(now = new Date()): string {
  return new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}
export function daysBefore(date: string, days: number): string {
  return new Date(Date.parse(date + "T00:00:00Z") - days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}
export function sentenceKey(s: Sentence): string {
  return JSON.stringify([s.episodeid, s.subtitleId]);
}
export function textHash(text: string): string {
  return createHash("sha256")
    .update(
      text
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim(),
    )
    .digest("hex");
}
export function dailySeed(
  secret: string,
  subject: string,
  date: string,
): string {
  return createHmac("sha256", secret)
    .update(JSON.stringify([DAILY_VERSION, subject, date]))
    .digest("hex");
}
export function windowPivot(seed: string, index: number): string {
  return createHash("md5").update(`${seed}:window:${index}`).digest("hex");
}
function randomScore(seed: string, key: string): number {
  return (
    parseInt(
      createHash("sha256")
        .update(`${seed}:rank:${key}`)
        .digest("hex")
        .slice(0, 8),
      16,
    ) / 4294967296
  );
}
export function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z-]/g, "");
}

function validDate(value: unknown, today: string): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value &&
    value <= today &&
    value >= daysBefore(today, 90)
  );
}

/** Strict bounded input. Client-supplied history never supplies identity or entitlement. */
export function parseDailyInput(value: unknown, today: string): DailyInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("INVALID_DAILY_INPUT");
  const v = value as Record<string, unknown>;
  if (
    Object.keys(v).some(
      (k) => !["anonymousId", "localHistory", "levels"].includes(k),
    )
  )
    throw new Error("INVALID_DAILY_INPUT");
  if (
    v.anonymousId !== undefined &&
    (typeof v.anonymousId !== "string" ||
      !/^[a-zA-Z0-9_-]{16,80}$/.test(v.anonymousId))
  )
    throw new Error("INVALID_DAILY_INPUT");
  if (
    v.levels !== undefined &&
    (!Array.isArray(v.levels) ||
      v.levels.length > 6 ||
      v.levels.some((l) => typeof l !== "string" || !/^[A-C][12]$/.test(l)))
  )
    throw new Error("INVALID_DAILY_INPUT");
  if (
    v.localHistory !== undefined &&
    (!Array.isArray(v.localHistory) || v.localHistory.length > 500)
  )
    throw new Error("INVALID_DAILY_INPUT");
  const localHistory: HistoryItem[] = [];
  for (const h of (v.localHistory || []) as unknown[]) {
    if (!h || typeof h !== "object") throw new Error("INVALID_DAILY_INPUT");
    const r = h as Record<string, unknown>;
    if (
      typeof r.episodeid !== "string" ||
      !r.episodeid ||
      r.episodeid.length > 128 ||
      !Number.isInteger(r.subtitleId) ||
      (r.subtitleId as number) < 0
    )
      throw new Error("INVALID_DAILY_INPUT");
    const item: HistoryItem = {
      episodeid: r.episodeid,
      subtitleId: r.subtitleId as number,
    };
    if (validDate(r.servedOn, today)) item.servedOn = r.servedOn;
    if (validDate(r.practicedOn, today)) item.practicedOn = r.practicedOn;
    if (item.servedOn || item.practicedOn) localHistory.push(item);
  }
  return {
    anonymousId: v.anonymousId as string | undefined,
    localHistory,
    levels: [...new Set((v.levels || []) as string[])],
  };
}

export function isDailyClipUsable(c: DailyClip): boolean {
  const words = c.wordsJson as TimedWord[];
  return (
    Number.isFinite(c.duration) &&
    c.duration >= 4 &&
    c.duration <= 10 &&
    !!c.enText.trim() &&
    !!c.zhText?.trim() &&
    (c.worthyScore === null || c.worthyScore >= 0.4) &&
    Array.isArray(words) &&
    words.length > 0 &&
    words.every(
      (w) =>
        w &&
        typeof w.word === "string" &&
        w.word.trim() &&
        typeof w.start === "number" &&
        typeof w.end === "number" &&
        Number.isFinite(w.start) &&
        Number.isFinite(w.end) &&
        w.end >= w.start,
    ) &&
    !isJunkClip(c, { minDurationSec: 4, maxDurationSec: 10 }) &&
    !hasSensitiveTerm(c.enText) &&
    !hasSensitiveTerm(c.zhText)
  );
}

export function mergeHistory(items: HistoryItem[]): Map<string, HistoryItem> {
  const out = new Map<string, HistoryItem>();
  for (const h of items) {
    const key = sentenceKey(h),
      old = out.get(key);
    out.set(key, {
      episodeid: h.episodeid,
      subtitleId: h.subtitleId,
      servedOn: [old?.servedOn, h.servedOn].filter(Boolean).sort().pop(),
      practicedOn: [old?.practicedOn, h.practicedOn]
        .filter(Boolean)
        .sort()
        .pop(),
    });
  }
  return out;
}

const STAGES = [
  {
    name: "normal",
    served: 30,
    practiced: 90,
    episodeCap: 1,
    topicCap: 2,
    preferred: true,
  },
  {
    name: "diversity_relaxed",
    served: 30,
    practiced: 90,
    episodeCap: 2,
    topicCap: 5,
    preferred: false,
  },
  {
    name: "practice_30",
    served: 30,
    practiced: 30,
    episodeCap: 2,
    topicCap: 5,
    preferred: false,
  },
  {
    name: "served_14",
    served: 14,
    practiced: 30,
    episodeCap: 2,
    topicCap: 5,
    preferred: false,
  },
  {
    name: "served_7",
    served: 7,
    practiced: 30,
    episodeCap: 2,
    topicCap: 5,
    preferred: false,
  },
];

/** Ranking is keyed by sentence, never array position. Cooldown precedes vocabulary. */
export function selectDaily(
  clips: DailyClip[],
  context: {
    date: string;
    seed: string;
    history: HistoryItem[];
    vocabulary: string[];
    levels: string[];
  },
  allowFallback = true,
): Selection {
  const history = mergeHistory(context.history);
  const vocab = new Set(
    context.vocabulary.map(normalizeWord).filter((w) => w.length >= 5),
  );
  const unique = new Map(
    clips.filter(isDailyClipUsable).map((c) => [sentenceKey(c), c]),
  );
  const ranked = [...unique.values()]
    .map((clip) => {
      const key = sentenceKey(clip),
        h = history.get(key);
      const practiced = [clip.lastPracticedOn, h?.practicedOn]
        .filter(Boolean)
        .sort()
        .pop();
      const matchedWords = [
        ...new Set(
          (clip.wordsJson as TimedWord[])
            .map((w) => normalizeWord(w.word || ""))
            .filter((w) => vocab.has(w)),
        ),
      ];
      const preferred = ["B1", "B2"].includes(clip.cefrLevel || "");
      const score =
        0.45 * randomScore(context.seed, key) +
        0.25 * (clip.worthyScore ?? 0.5) +
        0.15 * (context.levels.length || preferred ? 1 : 0.5) +
        0.15 * (matchedWords.length ? 1 : 0);
      return {
        clip,
        key,
        hash: textHash(clip.enText),
        matchedWords,
        practiced,
        served: h?.servedOn,
        preferred,
        score,
      };
    })
    .filter(
      (r) =>
        !context.levels.length ||
        context.levels.includes(r.clip.cefrLevel || ""),
    );
  let result: Selection = {
    items: [],
    status: "empty",
    fallbackStage: "normal",
  };
  for (const stage of allowFallback ? STAGES : STAGES.slice(0, 1)) {
    const candidates = ranked.filter(
      (r) =>
        (!r.served || r.served < daysBefore(context.date, stage.served)) &&
        (!r.practiced ||
          r.practiced < daysBefore(context.date, stage.practiced)) &&
        (!stage.preferred || context.levels.length || r.preferred),
    );
    candidates.sort((a, b) => {
      if (stage.served < 30 || stage.practiced < 90) {
        const recency =
          (a.served || "").localeCompare(b.served || "") ||
          (a.practiced || "").localeCompare(b.practiced || "");
        if (recency) return recency;
      }
      return b.score - a.score || a.key.localeCompare(b.key);
    });
    const picked: SelectionItem[] = [],
      keys = new Set<string>(),
      texts = new Set<string>();
    const episodes = new Map<string, number>(),
      topics = new Map<string, number>();
    const add = (r: (typeof candidates)[number], vocabulary: boolean) => {
      const topic = r.clip.topicTags[0] || "__unknown__";
      if (
        picked.length >= DAILY_SIZE ||
        keys.has(r.key) ||
        texts.has(r.hash) ||
        (episodes.get(r.clip.episodeid) || 0) >= stage.episodeCap ||
        (topics.get(topic) || 0) >= stage.topicCap
      )
        return;
      const reused =
        (r.served && r.served >= daysBefore(context.date, 30)) ||
        (r.practiced && r.practiced >= daysBefore(context.date, 90));
      picked.push({
        slot: picked.length + 1,
        clipid: r.clip.clipid,
        episodeid: r.clip.episodeid,
        subtitleId: r.clip.subtitleId,
        textHash: r.hash,
        matchedWords: r.matchedWords,
        selectionReason: reused
          ? "cooldown_reuse"
          : vocabulary
            ? "vocabulary"
            : "explore",
      });
      keys.add(r.key);
      texts.add(r.hash);
      episodes.set(r.clip.episodeid, (episodes.get(r.clip.episodeid) || 0) + 1);
      topics.set(topic, (topics.get(topic) || 0) + 1);
    };
    for (const r of candidates)
      if (picked.length < 2 && r.matchedWords.length && !r.practiced)
        add(r, true);
    for (const r of candidates) if (!r.matchedWords.length) add(r, false);
    for (const r of candidates) add(r, false); // Scarce non-hits must not make a rich vocabulary a penalty.
    result = {
      items: picked,
      status:
        picked.length === DAILY_SIZE
          ? "complete"
          : picked.length
            ? "partial"
            : "empty",
      fallbackStage: stage.name,
    };
    if (result.status === "complete") return result;
  }
  return result;
}
