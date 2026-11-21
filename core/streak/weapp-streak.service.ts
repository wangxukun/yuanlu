import { DEFAULT_DAILY_GOAL_MINS } from "@/core/stats/daily-goal";
import prisma from "@/lib/prisma";
import {
  chinaToday,
  chinaDayOf,
  subUTCDays,
  isSameUTCDay,
} from "@/core/utils/china-date";

/**
 * [weapp-backend] 小程序「每日学习连胜」域服务。
 *
 * 按中国日界读取当天累计收听秒数。达标才能首次点亮，已点亮的日期保留。
 */

export interface WeappStreakStatus {
  dailyGoal: {
    minutes: number;
    listenedSeconds: number;
    remainingMinutes: number;
  };
  streakDays: number;
  ignitedToday: boolean;
  /** 领先全站 X% 语伴 = 参与者（近 60 天有记录）中当前连胜少于我的人数占比 */
  percentile: number;
  /** 真实最近 7 天（i=6=今日）：label 按真实星期（今日格标「今日」），lit=当日有点亮行 */
  week: { date: string; label: string; lit: boolean; today: boolean }[];
}

const WEEK_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export type IgniteResult =
  | { ok: true; data: WeappStreakStatus & { justIgnited: boolean } }
  | { ok: false; code: string; message?: string };

/** 连续日回溯（batchStreak 同款）：dates 为某用户全部打卡日（任意序） */
function computeStreak(dates: Date[], today = chinaToday()): number {
  if (!dates.length) return 0;
  const sorted = dates
    .map((d) => chinaDayOf(d))
    .sort((a, b) => b.getTime() - a.getTime());
  const yesterday = subUTCDays(today, 1);
  if (!isSameUTCDay(sorted[0], today) && !isSameUTCDay(sorted[0], yesterday)) {
    return 0; // 断签：最近一次打卡既非今天也非昨天
  }
  let streak = 0;
  let cursor = sorted[0];
  for (const day of sorted) {
    if (isSameUTCDay(day, cursor)) {
      streak++;
      cursor = subUTCDays(cursor, 1);
    } else {
      break;
    }
  }
  return streak;
}

/** 个人中心和勋章解锁仅需本人的点亮日，沿用首页的连续日计算。 */
export async function getWeappStreakDays(userid: string): Promise<number> {
  const days = await prisma.weapp_streak_log.findMany({
    where: { userid },
    select: { date: true },
  });
  return computeStreak(days.map((row) => row.date));
}

/** 全表小体量（小程序专属，一人一日一行）——直接整表取行 JS 分组连算 */
async function loadAllRows(): Promise<Map<string, Date[]>> {
  const rows = await prisma.weapp_streak_log.findMany({
    select: { userid: true, date: true },
  });
  const byUser = new Map<string, Date[]>();
  for (const r of rows) {
    const list = byUser.get(r.userid) ?? [];
    list.push(r.date);
    byUser.set(r.userid, list);
  }
  return byUser;
}

async function readDailyGoal(userid: string, date: Date) {
  const [profile, activity] = await Promise.all([
    prisma.user_profile.findUnique({
      where: { userid },
      select: { dailyStudyGoalMins: true },
    }),
    prisma.user_daily_activity.findUnique({
      where: { userid_date: { userid, date } },
      select: { listeningSeconds: true },
    }),
  ]);
  const minutes = Math.max(
    1,
    profile?.dailyStudyGoalMins || DEFAULT_DAILY_GOAL_MINS,
  );
  const listenedSeconds = Math.max(0, activity?.listeningSeconds ?? 0);
  const remainingMinutes = Math.max(
    0,
    Math.ceil((minutes * 60 - listenedSeconds) / 60),
  );
  return { minutes, listenedSeconds, remainingMinutes };
}

/** 参与者窗口：近 60 天有记录才计入百分位分母（长期弃用者不垫底掺水） */
async function computeStatus(
  userid: string,
  byUser: Map<string, Date[]>,
  today: Date,
  dailyGoal: WeappStreakStatus["dailyGoal"],
): Promise<WeappStreakStatus> {
  const windowStart = subUTCDays(today, 59);
  const myDates = byUser.get(userid) ?? [];
  const streakDays = computeStreak(myDates, today);
  const daySet = new Set(myDates.map((d) => chinaDayOf(d).getTime()));
  const ignitedToday = daySet.has(today.getTime());
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = subUTCDays(today, 6 - i);
    return {
      date: d.toISOString().slice(0, 10),
      label: i === 6 ? "今日" : WEEK_LABELS[d.getUTCDay()],
      lit: daySet.has(d.getTime()),
      today: i === 6,
    };
  });

  let others = 0;
  let fewer = 0;
  for (const [uid, dates] of byUser) {
    if (uid === userid) continue;
    const active = dates.some(
      (d) => new Date(d).getTime() >= windowStart.getTime(),
    );
    if (!active) continue;
    others++;
    if (computeStreak(dates, today) < streakDays) fewer++;
  }
  const percentile = others > 0 ? Math.floor((fewer / others) * 100) : 0;

  return { streakDays, ignitedToday, percentile, week, dailyGoal };
}

/** GET /api/streak —— 连胜状态（streakDays / ignitedToday / percentile） */
export async function getStreakStatus(
  userid: string,
): Promise<WeappStreakStatus> {
  const today = chinaToday();
  const [rows, goal] = await Promise.all([
    loadAllRows(),
    readDailyGoal(userid, today),
  ]);
  return computeStatus(userid, rows, today, goal);
}

/** 批量连胜（跟读开口口径）：日榜达人卡 streakDays 装饰共用——与主页连胜卡
 *  同一数据源 weapp_streak_log（勿再用网站收听 isActive 口径，两套会打架） */
export async function streaksForUsers(
  userids: string[],
): Promise<Map<string, number>> {
  const byUser = await loadAllRows();
  const out = new Map<string, number>();
  for (const uid of new Set(userids.filter(Boolean))) {
    out.set(uid, computeStreak(byUser.get(uid) ?? []));
  }
  return out;
}

/**
 * POST /api/streak/ignite —— 点亮今日（当日幂等）。
 * 双通道：带 recognitionId = 跟读开口自动验收（校验归属 + 评测发生在今日
 * 中国日界，relay 同款后置动作模式，零侵入评测链）；不带 = 手动点亮。
 */
export async function igniteStreak(
  userid: string,
  recognitionId?: number,
): Promise<IgniteResult> {
  const today = chinaToday();
  let source = "MANUAL";
  let linkedRecognition: number | null = null;

  if (recognitionId != null) {
    if (!Number.isInteger(recognitionId) || recognitionId <= 0) {
      return {
        ok: false,
        code: "INVALID_RECOGNITION",
        message: "评测记录无效",
      };
    }
    const rec = await prisma.speech_recognition.findUnique({
      where: { recognitionid: recognitionId },
      select: { userid: true, recognitionDate: true },
    });
    if (!rec || rec.userid !== userid) {
      return {
        ok: false,
        code: "INVALID_RECOGNITION",
        message: "评测记录无效",
      };
    }
    if (
      !rec.recognitionDate ||
      !isSameUTCDay(chinaDayOf(rec.recognitionDate), today)
    ) {
      return {
        ok: false,
        code: "STALE_RECOGNITION",
        message: "评测已跨日，请重新跟读点亮",
      };
    }
    source = "SPEECH";
    linkedRecognition = recognitionId;
  }

  const existing = await prisma.weapp_streak_log.findUnique({
    where: { userid_date: { userid, date: today } },
    select: { id: true },
  });

  const goal = await readDailyGoal(userid, today);
  let justIgnited = false;
  if (!existing) {
    if (goal.remainingMinutes > 0) {
      return {
        ok: false,
        code: "DAILY_GOAL_PENDING",
        message: `还需收听 ${goal.remainingMinutes} 分钟才能点亮今日火苗`,
      };
    }
    const created = await prisma.weapp_streak_log.createMany({
      data: [{ userid, date: today, source, recognitionid: linkedRecognition }],
      skipDuplicates: true,
    });
    justIgnited = created.count > 0;
  }
  const status = await computeStatus(userid, await loadAllRows(), today, goal);
  return { ok: true, data: { ...status, justIgnited } };
}
