import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  WINDOW_SIZE,
  chinaDate,
  daysBefore,
  sentenceKey,
  type DailyClip,
  type HistoryItem,
  type SelectionItem,
} from "./daily-challenge.core";
import type {
  DailyAssignment,
  DailyChallengeDeps,
} from "./daily-challenge.service";

const dbDate = (date: string) => new Date(date + "T00:00:00Z");
type AssignmentRow = {
  id: string;
  date: Date;
  algorithmVersion: string;
  seedDigest: string;
  status: string;
  fallbackStage: string;
  items: Prisma.JsonValue;
};
function assignment(row: AssignmentRow): DailyAssignment {
  return {
    ...row,
    date: row.date.toISOString().slice(0, 10),
    status: row.status as DailyAssignment["status"],
    items: row.items as unknown as SelectionItem[],
  };
}

/** LIMIT applies before any user/episode filtering. Even exhausted pools have bounded work. */
export async function sampleWindow(pivot: string): Promise<DailyClip[]> {
  const range = (head: boolean, take: number) =>
    prisma.$queryRaw<DailyClip[]>(Prisma.sql`
    SELECT clipid, episodeid, "subtitleId", "enText", "zhText", "wordsJson",
      "startTime", "endTime", duration, wpm, "cefrLevel", "topicTags", "worthyScore", "sourceLabel", "coverUrl"
    FROM corpus_clips
    WHERE duration BETWEEN 4 AND 10
      AND "wordsJson" IS NOT NULL AND "zhText" IS NOT NULL
      AND ("worthyScore" >= 0.4 OR "worthyScore" IS NULL)
      AND (md5(episodeid || ':' || "subtitleId"::text) COLLATE "C")
        ${head ? Prisma.sql`<` : Prisma.sql`>=`} ${pivot}::text COLLATE "C"
    ORDER BY md5(episodeid || ':' || "subtitleId"::text) COLLATE "C", clipid
    LIMIT ${take}`);
  const tail = await range(false, WINDOW_SIZE);
  return tail.length === WINDOW_SIZE
    ? tail
    : tail.concat(await range(true, WINDOW_SIZE - tail.length));
}

export async function latestPractice(
  userid: string,
  candidates: { episodeid: string; subtitleId: number }[],
  since?: Date,
) {
  if (!candidates.length) return [];
  const keys = [
    ...new Map(candidates.map((c) => [sentenceKey(c), c])).values(),
  ];
  return prisma.$queryRaw<
    Array<{
      episodeid: string;
      subtitleId: number;
      recognitionDate: Date;
      overallScore: number;
      recognitionid: number;
    }>
  >(Prisma.sql`
    WITH candidates(episodeid, subtitle_id) AS (VALUES ${Prisma.join(keys.map((c) => Prisma.sql`(${c.episodeid}::text, ${c.subtitleId}::int)`))})
    SELECT c.episodeid, c.subtitle_id AS "subtitleId", r."recognitionDate", r."overallScore", r.recognitionid
    FROM candidates c
    JOIN LATERAL (
      SELECT "recognitionDate", "overallScore", recognitionid FROM speech_recognition
      WHERE userid = ${userid} AND episodeid = c.episodeid AND "subtitleId" = c.subtitle_id
        AND episodeid IS NOT NULL AND "subtitleId" IS NOT NULL
        AND "recognitionDate" IS NOT NULL AND "overallScore" IS NOT NULL
        ${since ? Prisma.sql`AND "recognitionDate" >= ${since}` : Prisma.empty}
      ORDER BY "recognitionDate" DESC LIMIT 1
    ) r ON true`);
}

export async function accessibleEpisodes(
  episodeIds: string[],
  premium: boolean,
) {
  return prisma.episode
    .findMany({
      where: {
        episodeid: { in: [...new Set(episodeIds)] },
        status: "published",
        ...(!premium
          ? { OR: [{ isExclusive: false }, { isExclusive: null }] }
          : {}),
      },
      select: {
        episodeid: true,
        isExclusive: true,
        audioUrl: true,
        audioFileName: true,
      },
    })
    .then(
      (eps) =>
        new Map(
          eps
            .filter((e) => e.audioUrl || e.audioFileName)
            .map((e) => [e.episodeid, e]),
        ),
    );
}

export async function loadAssignedClips(
  pairs: { episodeid: string; subtitleId: number }[],
) {
  if (!pairs.length) return [];
  return prisma.corpus_clips.findMany({
    where: { OR: pairs },
    select: {
      clipid: true,
      episodeid: true,
      subtitleId: true,
      enText: true,
      zhText: true,
      wordsJson: true,
      startTime: true,
      endTime: true,
      duration: true,
      wpm: true,
      cefrLevel: true,
      topicTags: true,
      worthyScore: true,
      sourceLabel: true,
      coverUrl: true,
    },
  });
}

export function buildDailyChallengeDeps(secret: string): DailyChallengeDeps {
  const findAssignment: DailyChallengeDeps["findAssignment"] = async (
    userid,
    date,
  ) => {
    const row = await prisma.daily_challenge_assignment.findUnique({
      where: { userid_date: { userid, date: dbDate(date) } },
    });
    return row ? assignment(row) : null;
  };
  return {
    secret,
    findAssignment,
    observe(metrics) {
      console.info("[daily-challenge.selection]", JSON.stringify(metrics));
    },
    async saveAssignment(userid, proposal) {
      await prisma.daily_challenge_assignment.createMany({
        data: [
          {
            userid,
            date: dbDate(proposal.date),
            algorithmVersion: proposal.algorithmVersion,
            seedDigest: proposal.seedDigest,
            status: proposal.status,
            fallbackStage: proposal.fallbackStage,
            items: proposal.items as unknown as Prisma.InputJsonValue,
          },
        ],
        skipDuplicates: true,
      });
      const winner = await findAssignment(userid, proposal.date);
      if (!winner) throw new Error("DAILY_ASSIGNMENT_NOT_SAVED");
      return winner;
    },
    async history(userid, date) {
      const since = dbDate(daysBefore(date, 90));
      const beforeDate = dbDate(date);
      const [rows, practicedRows] = await Promise.all([
        prisma.daily_challenge_assignment.findMany({
          where: {
            userid,
            date: { gte: since, lt: beforeDate },
          },
          select: { date: true, items: true },
        }),
        prisma.speech_recognition
          .findMany({
            where: {
              userid,
              episodeid: { not: null },
              subtitleId: { not: null },
              overallScore: { not: null },
              recognitionDate: { gte: since, lt: beforeDate },
            },
            select: {
              episodeid: true,
              subtitleId: true,
              recognitionDate: true,
            },
            orderBy: { recognitionDate: "desc" },
            take: 1000,
          })
          .catch(() => []),
      ]);
      const assigned = rows.flatMap((r) =>
        (r.items as unknown as SelectionItem[]).map(
          (i): HistoryItem => ({
            episodeid: i.episodeid,
            subtitleId: i.subtitleId,
            servedOn: r.date.toISOString().slice(0, 10),
          }),
        ),
      );
      const practiced = practicedRows
        .filter(
          (r) =>
            typeof r.episodeid === "string" &&
            typeof r.subtitleId === "number" &&
            r.recognitionDate instanceof Date,
        )
        .map(
          (r): HistoryItem => ({
            episodeid: r.episodeid as string,
            subtitleId: r.subtitleId as number,
            practicedOn: chinaDate(r.recognitionDate as Date),
          }),
        );
      return [...assigned, ...practiced];
    },
    async vocabulary(userid) {
      // Prefer active (non-mastered) words ordered by review urgency; fall back to plain select on minimal test schemas.
      try {
        const rows = await prisma.vocabulary.findMany({
          where: {
            userid,
            status: { not: "MASTERED" }, // 列非空：not 已覆盖全部非 MASTERED 行，null 分支不存在
          },
          select: { word: true },
          orderBy: [{ nextReviewAt: "asc" }, { proficiency: "asc" }],
          take: 500,
        });
        return rows.map((r) => r.word);
      } catch {
        return (
          await prisma.vocabulary.findMany({
            where: { userid },
            select: { word: true },
          })
        ).map((r) => r.word);
      }
    },
    async sample(pivot, _userid, premium) {
      const rows = await sampleWindow(pivot);
      if (!rows.length) return [];
      const episodes = await accessibleEpisodes(
        rows.map((r) => r.episodeid),
        premium,
      );
      return rows
        .filter((r) => episodes.has(r.episodeid))
        .map((r) => ({
          ...r,
          isExclusive: !!episodes.get(r.episodeid)?.isExclusive,
        }));
    },
  };
}
