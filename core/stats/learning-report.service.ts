import prisma from "@/lib/prisma";
import { addUTCDays } from "@/core/utils/china-date";

/** UTC 午夜 Date → yyyy-MM-dd 日期键（@db.Date 中国时区口径，仅取日期部分） */
function toDayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/**
 * [P3-f] 学习报表聚合 service（报告 4.2 / Antigravity 模块三 3.5）。
 *
 * 数据源 user_daily_activity（收听心跳沉淀，@db.Date 中国时区口径），
 * 查询走 `@@index([userid, date(sort: Desc)])`：where userid + date gte，
 * 单用户行数 ≤ 天数上限，无全表扫风险。
 *
 * 免费层 = 近 7 天简报；PRO = 近 365 天（月/季/年趋势与全年热力图由
 * 前端从同一份逐日数据聚合渲染——纯前端差异化，后端只出一份原始序列）。
 */

export interface DailyActivityPoint {
  /** yyyy-MM-dd（中国时区日期键） */
  date: string;
  /** 收听分钟数（向下取整） */
  minutes: number;
  /** 当日新增生词数 */
  wordsLearned: number;
  /** 是否达成当日目标（打卡） */
  isActive: boolean;
}

export interface LearningReportDto {
  days: DailyActivityPoint[];
  /** 当前连续打卡天数（与 statsService.calculateStreak 同口径语义） */
  streakDays: number;
  /** 用户每日目标（分钟），供建议与达标率计算 */
  dailyGoalMins: number;
}

export const FREE_REPORT_DAYS = 7;
export const PRO_REPORT_DAYS = 365;

export async function getLearningReport(
  userId: string,
  isPremium: boolean,
): Promise<LearningReportDto> {
  const span = isPremium ? PRO_REPORT_DAYS : FREE_REPORT_DAYS;
  // 中国时区今天（UTC 午夜）往前推 span-1 天
  const today = new Date();
  const chinaToday = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const since = addUTCDays(chinaToday, -(span - 1));

  const [activities, userProfile] = await Promise.all([
    prisma.user_daily_activity.findMany({
      where: { userid: userId, date: { gte: since } },
      orderBy: { date: "asc" },
      select: {
        date: true,
        listeningSeconds: true,
        wordsLearned: true,
        isActive: true,
      },
    }),
    prisma.user_profile.findUnique({
      where: { userid: userId },
      select: { dailyStudyGoalMins: true },
    }),
  ]);

  // 逐日补零（报表/热力图需要连续序列）
  const byKey = new Map(
    activities.map((a) => [
      toDayKey(a.date),
      {
        minutes: Math.floor(a.listeningSeconds / 60),
        wordsLearned: a.wordsLearned,
        isActive: a.isActive,
      },
    ]),
  );
  const days: DailyActivityPoint[] = [];
  for (let i = 0; i < span; i++) {
    const key = toDayKey(addUTCDays(since, i));
    const hit = byKey.get(key);
    days.push({
      date: key,
      minutes: hit?.minutes ?? 0,
      wordsLearned: hit?.wordsLearned ?? 0,
      isActive: hit?.isActive ?? false,
    });
  }

  // 连续打卡：从今天（或昨天）往回数 isActive 连续天数
  let streakDays = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (!days[i].isActive) {
      // 今天还没打卡不打断连续（从昨天起算）
      if (i === days.length - 1) continue;
      break;
    }
    streakDays++;
  }

  return {
    days,
    streakDays,
    dailyGoalMins: userProfile?.dailyStudyGoalMins ?? 20,
  };
}
