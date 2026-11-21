import prisma from "@/lib/prisma";
import {
  addUTCDays,
  chinaDayOf,
  chinaMidnightInstant,
  chinaStartOfWeek,
} from "@/core/utils/china-date";

export function listWeekListeningDays(userid: string, weekStart: Date) {
  return prisma.user_daily_activity.findMany({
    where: { userid, date: { gte: weekStart, lt: addUTCDays(weekStart, 7) } },
    select: { date: true, listeningSeconds: true },
  });
}

export function countWeekWords(userid: string, dateInWeek: Date) {
  // addedDate 是 timestamptz，必须用北京周一零点对应的实际时刻。
  const start = chinaMidnightInstant(chinaStartOfWeek(dateInWeek));
  return prisma.vocabulary.count({
    where: { userid, addedDate: { gte: start, lt: addUTCDays(start, 7) } },
  });
}

export async function getGoalProgress(userid: string, now = new Date()) {
  const today = chinaDayOf(now);
  const [days, weeklyWords] = await Promise.all([
    listWeekListeningDays(userid, chinaStartOfWeek(now)),
    countWeekWords(userid, now),
  ]);
  return {
    todaySeconds:
      days.find((row) => row.date.getTime() === today.getTime())
        ?.listeningSeconds ?? 0,
    weeklySeconds: days.reduce((total, row) => total + row.listeningSeconds, 0),
    weeklyWords,
  };
}
