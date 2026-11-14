import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { signOssHttpUrl } from "@/lib/oss";
import {
  detectFastLinks,
  hasSensitiveTerm,
  type TimedWord,
} from "@/core/corpus/clip-core";
import { isJunkClip } from "@/core/studio/curator.core";
import { clipAudioService } from "@/core/corpus/clip-audio.service";
import { buildRealClipAudioDeps } from "@/core/corpus/clip-audio.deps";

export const REELS_MIN_SEC = 4;
export const REELS_MAX_SEC = 10;
export const OVERFETCH = 15;
export const RING_OVERFETCH = 2;
export const PRE_SIGN_AUDIO = 3;

export interface ReelsClipRow {
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
  ringKey?: string;
}

export interface ReelsFeedItemDTO {
  clipid: string;
  episodeid: string;
  subtitleId: number;
  podcastTitle: string;
  topic: string;
  difficulty: string;
  coverUrl: string | null;
  start: number;
  end: number;
  duration: number;
  textEn: string;
  textCn: string | null;
  words: TimedWord[];
  phoneticTip: string | null;
  wpm: number;
  isExclusive: boolean;
  clipAudioUrl: string | null;
  clipOffset: number;
  ringKey?: string;
}

export interface ReelsFeedPageDTO {
  items: ReelsFeedItemDTO[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  mode?: "legacy" | "ring";
  nextCursor?: string;
  wrapped?: boolean;
}

export function buildPhoneticTip(
  words: TimedWord[],
  wpm: number,
): string | null {
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

export function seededShuffle<T>(arr: T[], seed: number): T[] {
  let a = 0x9e3779b9 ^ seed;
  const rand = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function parseLevels(raw: string | null): string[] {
  return (raw || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-C][12]$/.test(s))
    .slice(0, 6);
}

export function parseRingCursor(raw: string | null): string | null {
  if (raw === null) return null;
  const clean = raw.trim().toLowerCase();
  if (/^[0-9a-f]{0,32}$/.test(clean)) return clean;
  return null;
}

export function isCleanReelsRow(r: ReelsClipRow): boolean {
  return (
    !isJunkClip(r, {
      minDurationSec: REELS_MIN_SEC,
      maxDurationSec: REELS_MAX_SEC,
    }) &&
    !hasSensitiveTerm(r.enText) &&
    !hasSensitiveTerm(r.zhText)
  );
}

export function pickRingPage(
  rows: ReelsClipRow[],
  pageSize: number,
  wrapped: boolean,
): { picked: ReelsClipRow[]; nextCursor: string; wrapped: boolean } {
  const perEpisode = new Map<string, number>();
  const picked: ReelsClipRow[] = [];
  let lastConsumedKey = "";
  for (const r of rows) {
    lastConsumedKey = r.ringKey || lastConsumedKey;
    if (!isCleanReelsRow(r)) continue;
    const n = perEpisode.get(r.episodeid) || 0;
    if (n >= 2) continue;
    perEpisode.set(r.episodeid, n + 1);
    picked.push(r);
    if (picked.length >= pageSize) break;
  }
  return {
    picked,
    nextCursor: lastConsumedKey,
    wrapped,
  };
}

async function queryRingWindow(
  cursor: string,
  levels: string[],
  take: number,
): Promise<{ rows: ReelsClipRow[]; wrapped: boolean }> {
  const levelFilter = levels.length
    ? Prisma.sql`AND "cefrLevel" IN (${Prisma.join(levels)})`
    : Prisma.empty;
  const range = (head: boolean, limit: number) =>
    prisma.$queryRaw<ReelsClipRow[]>(Prisma.sql`
      SELECT
        clipid, episodeid, "subtitleId", "startTime", "endTime", duration,
        "enText", "zhText", "wordsJson", wpm, "cefrLevel", "coverUrl",
        "sourceLabel", "topicTags",
        substring(md5(episodeid || ':' || "subtitleId"::text) FROM 1 FOR 16) AS "ringKey"
      FROM corpus_clips
      WHERE duration BETWEEN 4 AND 10
        AND "wordsJson" IS NOT NULL AND "zhText" IS NOT NULL
        AND ("worthyScore" >= 0.4 OR "worthyScore" IS NULL)
        ${levelFilter}
        AND (md5(episodeid || ':' || "subtitleId"::text) COLLATE "C")
          ${head ? Prisma.sql`<` : Prisma.sql`>`} ${cursor}::text COLLATE "C"
      ORDER BY md5(episodeid || ':' || "subtitleId"::text) COLLATE "C", clipid
      LIMIT ${limit}
    `);

  const tail = await range(false, take);
  if (tail.length >= take || cursor === "") {
    return { rows: tail, wrapped: false };
  }
  const head = await range(true, take - tail.length);
  return { rows: tail.concat(head), wrapped: head.length > 0 };
}

async function hydrateReelsItems(
  picked: ReelsClipRow[],
  includeRingKey: boolean,
): Promise<ReelsFeedItemDTO[]> {
  const episodeIds = [...new Set(picked.map((r) => r.episodeid))];
  const exclusiveMap = new Map<string, boolean>();
  if (episodeIds.length) {
    const eps = await prisma.episode.findMany({
      where: { episodeid: { in: episodeIds } },
      select: { episodeid: true, isExclusive: true },
    });
    eps.forEach((e) => exclusiveMap.set(e.episodeid, !!e.isExclusive));
  }

  const preAudio = new Map<string, { url: string; clipOffset: number }>();
  await Promise.all(
    picked.slice(0, PRE_SIGN_AUDIO).map(async (r) => {
      const audio = await clipAudioService
        .ensureClipAudio(r.clipid, buildRealClipAudioDeps())
        .catch(() => null);
      if (audio && audio.ok) {
        preAudio.set(r.clipid, {
          url: audio.url,
          clipOffset: audio.clipOffset,
        });
      }
    }),
  );

  return Promise.all(
    picked.map(async (r) => {
      const pre = preAudio.get(r.clipid);
      const words = (
        Array.isArray(r.wordsJson) ? r.wordsJson : []
      ) as TimedWord[];
      const item: ReelsFeedItemDTO = {
        clipid: r.clipid,
        episodeid: r.episodeid,
        subtitleId: r.subtitleId,
        podcastTitle: r.sourceLabel || "原声节目",
        topic: r.topicTags && r.topicTags.length ? r.topicTags[0] : "",
        difficulty: r.cefrLevel || "",
        coverUrl: await signOssHttpUrl(r.coverUrl),
        start: r.startTime,
        end: r.endTime,
        duration: r.duration,
        textEn: r.enText
          .replace(/^\s*(?:\[SPEAKER_\d+\]|SPEAKER_\d+\s*:)\s*/gi, "")
          .replace(/\s*\[SPEAKER_\d+\]\s*/gi, " ")
          .trim(),
        textCn: r.zhText
          ? r.zhText
              .replace(/^\s*(?:\[SPEAKER_\d+\]|SPEAKER_\d+\s*:)\s*/gi, "")
              .replace(/\s*\[SPEAKER_\d+\]\s*/gi, " ")
              .trim()
          : null,
        words,
        phoneticTip: buildPhoneticTip(words, r.wpm),
        wpm: r.wpm,
        isExclusive: exclusiveMap.get(r.episodeid) || false,
        clipAudioUrl: pre ? pre.url : null,
        clipOffset: pre ? pre.clipOffset : r.startTime,
      };
      if (includeRingKey && r.ringKey) item.ringKey = r.ringKey;
      return item;
    }),
  );
}

export async function getReelsFeed(params: {
  page: number;
  pageSize: number;
  levels: string[];
  cursor: string | null;
}): Promise<ReelsFeedPageDTO> {
  const { page, pageSize, levels, cursor } = params;

  if (cursor !== null) {
    const poolSize = Math.max(24, pageSize * RING_OVERFETCH);
    const { rows, wrapped } = await queryRingWindow(cursor, levels, poolSize);
    const { picked, nextCursor } = pickRingPage(rows, pageSize, wrapped);
    const items = await hydrateReelsItems(picked, true);
    return {
      items,
      page: 1,
      pageSize,
      hasMore: rows.length >= pageSize,
      mode: "ring",
      nextCursor: nextCursor || cursor,
      wrapped,
    };
  }

  const where = {
    duration: { gte: REELS_MIN_SEC, lte: REELS_MAX_SEC },
    wordsJson: { not: Prisma.DbNull },
    zhText: { not: null },
    ...(levels.length ? { cefrLevel: { in: levels } } : {}),
    OR: [{ worthyScore: { gte: 0.4 } }, { worthyScore: null }],
  };

  const poolSize = pageSize * OVERFETCH;
  const [rows, total] = await Promise.all([
    prisma.corpus_clips.findMany({
      where,
      select: {
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
      },
      orderBy: [{ createdAt: "desc" }, { clipid: "asc" }],
      skip: (page - 1) * poolSize,
      take: poolSize,
    }),
    prisma.corpus_clips.count({ where }),
  ]);

  const clean = rows.filter(isCleanReelsRow);
  const shuffled = seededShuffle(clean, page * 2654435761);
  const perEpisode = new Map<string, number>();
  const picked: ReelsClipRow[] = [];
  for (const r of shuffled) {
    const n = perEpisode.get(r.episodeid) || 0;
    if (n >= 2) continue;
    perEpisode.set(r.episodeid, n + 1);
    picked.push(r);
    if (picked.length >= pageSize) break;
  }

  const items = await hydrateReelsItems(picked, false);
  return {
    items,
    page,
    pageSize,
    hasMore: page * poolSize < total,
  };
}
