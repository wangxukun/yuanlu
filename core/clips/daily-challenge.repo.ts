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
      const rows = await prisma.daily_challenge_assignment.findMany({
        where: {
          userid,
          date: { gte: dbDate(daysBefore(date, 90)), lt: dbDate(date) },
        },
        select: { date: true, items: true },
      });
      return rows.flatMap((r) =>
        (r.items as unknown as SelectionItem[]).map(
          (i): HistoryItem => ({
            episodeid: i.episodeid,
            subtitleId: i.subtitleId,
            servedOn: r.date.toISOString().slice(0, 10),
          }),
        ),
      );
    },
    async vocabulary(userid) {
      return (
        await prisma.vocabulary.findMany({
          where: { userid },
          select: { word: true },
        })
      ).map((r) => r.word);
    },
    async sample(pivot, userid, premium) {
      const rows = await sampleWindow(pivot);
      if (!rows.length) return [];
      const [episodes, practiced] = await Promise.all([
        accessibleEpisodes(
          rows.map((r) => r.episodeid),
          premium,
        ),
        userid ? latestPractice(userid, rows) : Promise.resolve([]),
      ]);
      const practiceMap = new Map(
        practiced.map((p) => [sentenceKey(p), chinaDate(p.recognitionDate)]),
      );
      return rows
        .filter((r) => episodes.has(r.episodeid))
        .map((r) => ({
          ...r,
          lastPracticedOn: practiceMap.get(sentenceKey(r)),
          isExclusive: !!episodes.get(r.episodeid)?.isExclusive,
        }));
    },
  };
}
