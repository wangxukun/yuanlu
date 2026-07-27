/**
 * China Timezone Date Utilities
 *
 * PostgreSQL 的 @db.Date 类型只存储日期部分（YYYY-MM-DD），不含时间。
 * 当 Node.js 用 `startOfDay(new Date())` 生成日期传给 Prisma 时，
 * 实际传递的是本地时区午夜的 UTC 表示（如 CST 2026-07-27 00:00 = UTC 2026-07-26 16:00），
 * PostgreSQL 会截断为 2026-07-26，导致日期偏差一天。
 *
 * 本模块提供统一的日期工具函数，始终以 Asia/Shanghai (UTC+8) 时区为基准，
 * 生成 UTC 午夜 Date 对象（如 2026-07-27T00:00:00.000Z），与 @db.Date 的存储方式一致。
 */

const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8

/**
 * 获取中国时区"今天"对应的 UTC 午夜 Date
 * 例如: 北京时间 2026-07-27 20:00 → Date("2026-07-27T00:00:00.000Z")
 *
 * 这样传给 Prisma 的 @db.Date 字段时，PostgreSQL 存储的日期就是正确的 2026-07-27
 */
export function chinaToday(): Date {
  const now = new Date();
  // 计算中国时区当前时间的 "日期字符串"
  const chinaTime = new Date(now.getTime() + CHINA_OFFSET_MS);
  const year = chinaTime.getUTCFullYear();
  const month = chinaTime.getUTCMonth();
  const day = chinaTime.getUTCDate();
  // 返回 UTC 午夜：确保 PostgreSQL @db.Date 截断后日期不变
  return new Date(Date.UTC(year, month, day));
}

/**
 * 将任意 Date 转为中国时区当天的 UTC 午夜表示
 * 用于日期比较和周计算
 */
export function chinaDayOf(date: Date): Date {
  const chinaTime = new Date(date.getTime() + CHINA_OFFSET_MS);
  const year = chinaTime.getUTCFullYear();
  const month = chinaTime.getUTCMonth();
  const day = chinaTime.getUTCDate();
  return new Date(Date.UTC(year, month, day));
}

/**
 * 获取包含给定日期所在周的周一（中国时区），返回 UTC 午夜
 * weekStartsOn: 1 (Monday)
 */
export function chinaStartOfWeek(date: Date): Date {
  const chinaDay = chinaDayOf(date);
  // getUTCDay(): 0=Sun, 1=Mon, ..., 6=Sat
  const dayOfWeek = chinaDay.getUTCDay();
  // 偏移到周一: 周日(0) → -6, 周一(1) → 0, 周二(2) → -1, ...
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return new Date(chinaDay.getTime() + diff * 24 * 60 * 60 * 1000);
}

/**
 * 获取包含给定日期所在周的周日（中国时区），返回 UTC 午夜
 */
export function chinaEndOfWeek(date: Date): Date {
  const monday = chinaStartOfWeek(date);
  return new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
}

/**
 * 在 UTC 午夜 Date 上增加指定天数
 */
export function addUTCDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * 在 UTC 午夜 Date 上减少指定天数
 */
export function subUTCDays(date: Date, days: number): Date {
  return addUTCDays(date, -days);
}

/**
 * 判断两个日期是否是同一天（基于 UTC 日期部分）
 */
export function isSameUTCDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * 将 Prisma 从 @db.Date 字段读出的 Date 归一化为 UTC 午夜字符串 key
 * Prisma 返回的 @db.Date 值通常已经是 UTC 午夜（如 2026-07-27T00:00:00.000Z），
 * 但为安全起见，统一提取年月日再构造
 */
export function dateToUTCKey(date: Date): string {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ).toString();
}
