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
 * 与网站版 user_daily_activity（收听秒数达标 isActive 口径）**完全隔离**：
 * 不写不读该表，验收标准独立——跟读开口（评测完成即点亮，不设分数线，
 * 接力评测也算）+ 手动点亮双通道；一人一日一行（中国日界，唯一约束权威
 * 判重防刷天）；streakDays 读时连算（最新行须为今天/昨天，否则断签归 0）。
 */

export interface WeappStreakStatus {
  streakDays: number;
  ignitedToday: boolean;
  /** 领先全站 X% 语伴 = 参与者（近 60 天有记录）中当前连胜少于我的人数占比 */
  percentile: number;
}

export type IgniteResult =
  | { ok: true; data: WeappStreakStatus & { justIgnited: boolean } }
  | { ok: false; code: string; message?: string };

/** 连续日回溯（batchStreak 同款）：dates 为某用户全部打卡日（任意序） */
function computeStreak(dates: Date[]): number {
  if (!dates.length) return 0;
  const sorted = dates
    .map((d) => chinaDayOf(d))
    .sort((a, b) => b.getTime() - a.getTime());
  const today = chinaToday();
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

/** 参与者窗口：近 60 天有记录才计入百分位分母（长期弃用者不垫底掺水） */
async function computeStatus(
  userid: string,
  byUser: Map<string, Date[]>,
): Promise<WeappStreakStatus> {
  const today = chinaToday();
  const windowStart = subUTCDays(today, 59);
  const myDates = byUser.get(userid) ?? [];
  const streakDays = computeStreak(myDates);
  const ignitedToday = myDates.some((d) => isSameUTCDay(chinaDayOf(d), today));

  let others = 0;
  let fewer = 0;
  for (const [uid, dates] of byUser) {
    if (uid === userid) continue;
    const active = dates.some(
      (d) => new Date(d).getTime() >= windowStart.getTime(),
    );
    if (!active) continue;
    others++;
    if (computeStreak(dates) < streakDays) fewer++;
  }
  const percentile = others > 0 ? Math.floor((fewer / others) * 100) : 0;

  return { streakDays, ignitedToday, percentile };
}

/** GET /api/streak —— 连胜状态（streakDays / ignitedToday / percentile） */
export async function getStreakStatus(
  userid: string,
): Promise<WeappStreakStatus> {
  return computeStatus(userid, await loadAllRows());
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
      !isSameUTCDay(chinaDayOf(rec.recognitionDate), chinaToday())
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

  const today = chinaToday();
  const existing = await prisma.weapp_streak_log.findUnique({
    where: { userid_date: { userid, date: today } },
    select: { id: true },
  });

  let justIgnited = false;
  if (!existing) {
    const created = await prisma.weapp_streak_log
      .create({
        data: { userid, date: today, source, recognitionid: linkedRecognition },
      })
      .catch(() => null); // 并发竞态下唯一冲突 → 视为已点亮
    justIgnited = !!created;
  }

  const status = await computeStatus(userid, await loadAllRows());
  return { ok: true, data: { ...status, justIgnited } };
}
