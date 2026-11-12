import prisma from "@/lib/prisma";
import { chinaDayOf, addUTCDays } from "@/core/utils/china-date";
import { DEFAULT_DAILY_GOAL_MINS } from "./stats.service";

/** @db.Date uses a date key; timestamptz queries use the actual China midnight. */
export function studioDayBounds(now = new Date()) {
  const day = chinaDayOf(now);
  const start = new Date(day.getTime() - 8 * 3600000);
  return { day, start, end: addUTCDays(start, 1) };
}

export function summarizeStudyDays(
  day: Date,
  activities: { date: Date; isActive: boolean; listeningSeconds: number }[],
  goalMins: number,
) {
  const today = activities.find((a) => a.date.getTime() === day.getTime());
  const todaySeconds = today?.listeningSeconds ?? 0;
  const achieved = todaySeconds >= goalMins * 60;
  // Historical days retain the goal that was in force at the time.
  const active = new Set(
    activities
      .filter((a) =>
        a.date.getTime() === day.getTime() ? achieved : a.isActive,
      )
      .map((a) => a.date.getTime()),
  );
  let cursor = achieved ? day : addUTCDays(day, -1);
  let streakDays = 0;
  while (active.has(cursor.getTime())) {
    streakDays++;
    cursor = addUTCDays(cursor, -1);
  }
  const labels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return {
    streakDays,
    achieved,
    goalMins,
    remainingMins: Math.max(0, Math.ceil((goalMins * 60 - todaySeconds) / 60)),
    week: Array.from({ length: 7 }, (_, i) => {
      const date = addUTCDays(day, i - 6);
      return {
        date: date.toISOString().slice(0, 10),
        label: i === 6 ? "今日" : labels[date.getUTCDay()],
        lit: active.has(date.getTime()),
        today: i === 6,
      };
    }),
  };
}

/** Read-only aggregation. Local studio demos never contribute to these counts. */
export async function getStudioDashboard(userid: string, now = new Date()) {
  const { day, start, end } = studioDayBounds(now);
  const dueWhere = {
    userid,
    status: { not: "MASTERED" },
    OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
  };
  const [profile, activities, speech, passed, total, mastered, due, sentences] =
    await Promise.all([
      prisma.user_profile.findUnique({
        where: { userid },
        select: { dailyStudyGoalMins: true, learnLevel: true },
      }),
      prisma.user_daily_activity.findMany({
        where: {
          userid,
          date: { lte: day },
          OR: [{ isActive: true }, { date: day }],
        },
        select: { date: true, isActive: true, listeningSeconds: true },
      }),
      prisma.speech_recognition.groupBy({
        by: ["userid"],
        where: {
          userid: { not: null },
          recognitionDate: { gte: start, lt: end },
        },
        _count: { recognitionid: true },
      }),
      prisma.speech_recognition.count({
        where: {
          userid,
          recognitionDate: { gte: start, lt: end },
          overallScore: { gte: 85 },
        },
      }),
      prisma.vocabulary.count({ where: { userid } }),
      prisma.vocabulary.count({ where: { userid, status: "MASTERED" } }),
      prisma.vocabulary.count({ where: dueWhere }),
      prisma.savedSentence.count({ where: { userid } }),
    ]);
  const myCount =
    speech.find((r) => r.userid === userid)?._count.recognitionid ?? 0;
  // Match the daily count leaderboard's stable tie order. No practice means no rank.
  const rank = myCount
    ? 1 +
      speech.filter(
        (r) =>
          r._count.recognitionid > myCount ||
          (r._count.recognitionid === myCount && r.userid! < userid),
      ).length
    : null;
  const levelMap: Record<string, string> = {
    Beginner: "A2",
    Intermediate: "B1",
    Advanced: "C1",
    A1: "A2",
    A2: "A2",
    B1: "B1",
    B2: "B2",
    C1: "C1",
    C2: "C1",
  };
  return {
    date: day.toISOString().slice(0, 10),
    timezone: "Asia/Shanghai",
    study: summarizeStudyDays(
      day,
      activities,
      Math.max(1, profile?.dailyStudyGoalMins || DEFAULT_DAILY_GOAL_MINS),
    ),
    shadowing: { count: myCount, passed, passScore: 85, rank },
    vocabulary: { total, mastered, due },
    sentences: { total: sentences },
    recommendation: {
      level: levelMap[profile?.learnLevel || ""] || "B1",
      hasProfileLevel: !!levelMap[profile?.learnLevel || ""],
    },
  };
}
