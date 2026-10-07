"use server";

import prisma from "@/lib/prisma";
import { requireAdminAction } from "@/core/auth/guard";
import { Prisma } from "@prisma/client";
import { chinaToday, subUTCDays } from "@/core/utils/china-date";

/** 全年流量热力图窗口：滚动近 365 天 */
const TRAFFIC_HEATMAP_DAYS = 365;

/**
 * 转化埋点管理端统计（/admin/conversion）。
 *
 * 事件量级可控（漏斗触点，非全量行为日志），周期内事件一次性取回后在
 * JS 内聚合，避免 Prisma groupBy 无法直接做 COUNT(DISTINCT userid) 的问题。
 */

export interface ConversionSummary {
  eventType: string;
  times: number;
  users: number; // 独立用户数（userid 为空的事件不计入）
}

export interface ConversionSourceRow {
  eventType: string;
  source: string;
  times: number;
  users: number;
}

export interface ConversionTrendPoint {
  date: string; // MM-dd
  isoDate: string; // yyyy-MM-dd
  TRIAL_REACHED: number;
  PREMIUM_MODAL_OPEN: number;
  QUOTA_BLOCKED: number;
}

export interface ConversionRecentEvent {
  id: string;
  eventType: string;
  source: string | null;
  userid: string | null;
  metadata: unknown;
  createdAt: Date;
  nickname: string | null;
  email: string | null;
}

export interface ConversionStats {
  days: number;
  summary: ConversionSummary[];
  sources: ConversionSourceRow[];
  trend: ConversionTrendPoint[];
  recent: ConversionRecentEvent[];
  newSubscriptions: number;
}

export async function getConversionStats(days = 30): Promise<ConversionStats> {
  await requireAdminAction();

  const periodDays = [7, 30, 90].includes(days) ? days : 30;
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (periodDays - 1));

  // 日分桶统一使用本地时区日期，避免 UTC 换算导致午夜附近事件掉进相邻桶
  const toLocalISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;

  const [events, recent, newSubscriptions] = await Promise.all([
    prisma.conversion_events.findMany({
      where: { createdAt: { gte: since } },
      select: { eventType: true, source: true, userid: true, createdAt: true },
    }),
    prisma.conversion_events.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        eventType: true,
        source: true,
        userid: true,
        metadata: true,
        createdAt: true,
        User: {
          select: {
            email: true,
            user_profile: { select: { nickname: true } },
          },
        },
      },
    }),
    prisma.subscriptions.count({
      where: { subscriptionType: "PREMIUM", startDate: { gte: since } },
    }),
  ]);

  // 按事件类型汇总（次数 + 独立用户数）
  const summaryMap = new Map<string, { times: number; users: Set<string> }>();
  // 按事件类型 + 来源汇总
  const sourceMap = new Map<string, { times: number; users: Set<string> }>();
  // 按天聚合
  const dayMap = new Map<
    string,
    ConversionTrendPoint & { _users: Set<string> }
  >();

  for (const ev of events) {
    const s = summaryMap.get(ev.eventType) ?? { times: 0, users: new Set() };
    s.times += 1;
    if (ev.userid) s.users.add(ev.userid);
    summaryMap.set(ev.eventType, s);

    const key = `${ev.eventType}|${ev.source ?? "unknown"}`;
    const src = sourceMap.get(key) ?? { times: 0, users: new Set() };
    src.times += 1;
    if (ev.userid) src.users.add(ev.userid);
    sourceMap.set(key, src);

    const iso = toLocalISO(ev.createdAt);
    const day = dayMap.get(iso) ?? {
      date: `${iso.slice(5, 7)}-${iso.slice(8, 10)}`,
      isoDate: iso,
      TRIAL_REACHED: 0,
      PREMIUM_MODAL_OPEN: 0,
      QUOTA_BLOCKED: 0,
      _users: new Set(),
    };
    if (ev.eventType in day) {
      (day as unknown as Record<string, number>)[ev.eventType] += 1;
    }
    if (ev.userid) day._users.add(ev.userid);
    dayMap.set(iso, day);
  }

  // 补齐周期内没有事件的天，保证趋势图连续
  const trend: ConversionTrendPoint[] = [];
  const cursor = new Date(since);
  for (let i = 0; i < periodDays; i++) {
    const iso = toLocalISO(cursor);
    const day = dayMap.get(iso);
    trend.push({
      date: `${iso.slice(5, 7)}-${iso.slice(8, 10)}`,
      isoDate: iso,
      TRIAL_REACHED: day?.TRIAL_REACHED ?? 0,
      PREMIUM_MODAL_OPEN: day?.PREMIUM_MODAL_OPEN ?? 0,
      QUOTA_BLOCKED: day?.QUOTA_BLOCKED ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    days: periodDays,
    summary: [...summaryMap.entries()]
      .map(([eventType, v]) => ({
        eventType,
        times: v.times,
        users: v.users.size,
      }))
      .sort((a, b) => b.times - a.times),
    sources: [...sourceMap.entries()]
      .map(([key, v]) => {
        const [eventType, source] = key.split("|");
        return { eventType, source, times: v.times, users: v.users.size };
      })
      .sort((a, b) => b.times - a.times),
    trend,
    recent: recent.map((ev) => ({
      id: ev.id,
      eventType: ev.eventType,
      source: ev.source,
      userid: ev.userid,
      metadata: ev.metadata as Prisma.JsonValue,
      createdAt: ev.createdAt,
      nickname: ev.User?.user_profile?.nickname ?? null,
      email: ev.User?.email ?? null,
    })),
    newSubscriptions,
  };
}

export interface YearTrafficDay {
  date: string; // yyyy-MM-dd（Asia/Shanghai）
  onlineUsers: number; // 在线 · 登录用户（按 userid 去重）
  onlineGuests: number; // 在线 · 游客（按 IP 去重，剔除当日已被登录用户占用的 IP）
  registrations: number; // 新注册用户
}

export interface YearTrafficHeatmap {
  startDate: string;
  endDate: string;
  days: YearTrafficDay[];
}

/**
 * 全年流量热力图（近 365 天滚动窗口，北京时区逐日分桶）：
 * - 在线 · 登录用户 = VisitorLog 按 userid 去重
 * - 在线 · 游客 = VisitorLog 按 IP 去重，且剔除当日出现过登录访问的同 IP
 *   （同一人"先匿名浏览、后登录"只计入登录用户，不重复计）
 * - 注册人数 = User 按注册时间逐日计数
 *
 * 访问日志全年逐行拉取量过大，且 Prisma groupBy 无法按日期部分分桶，
 * 故在 SQL 内聚合（时区口径与 core/utils/china-date.ts 统一为 Asia/Shanghai）。
 */
export async function getYearTrafficHeatmap(): Promise<YearTrafficHeatmap> {
  await requireAdminAction();

  const end = chinaToday();
  const start = subUTCDays(end, TRAFFIC_HEATMAP_DAYS - 1);

  const [onlineRows, regRows] = await Promise.all([
    prisma.$queryRaw<
      { day: string; users: number; guests: number }[]
    >(Prisma.sql`
      WITH daily AS (
        SELECT to_char("createAt" AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD') AS day,
               "userid",
               -- 归一化 IPv4 映射的 IPv6（::ffff:a.b.c.d），与 normalizeIp 口径一致
               regexp_replace("ip", '^::ffff:', '') AS "ip"
        FROM "VisitorLog"
        WHERE "createAt" >= ${start}
      ),
      agg AS (
        SELECT day, COUNT(DISTINCT "userid")::int AS users
        FROM daily WHERE "userid" IS NOT NULL GROUP BY day
      ),
      guest_ips AS (
        SELECT DISTINCT day, "ip" FROM daily
        WHERE "userid" IS NULL AND "ip" IS NOT NULL
      ),
      logged_ips AS (
        SELECT DISTINCT day, "ip" FROM daily
        WHERE "userid" IS NOT NULL AND "ip" IS NOT NULL
      ),
      guests AS (
        -- 游客 IP 反连接当日登录 IP：同 IP 只计登录用户（哈希连接，避免
        -- 相关子查询被逐行求值导致全年扫描近分钟级）
        SELECT g.day, COUNT(*)::int AS guests
        FROM guest_ips g
        LEFT JOIN logged_ips l ON l.day = g.day AND l.ip = g.ip
        WHERE l.ip IS NULL
        GROUP BY g.day
      )
      SELECT COALESCE(a.day, gs.day) AS day,
             COALESCE(a.users, 0)::int AS users,
             COALESCE(gs.guests, 0)::int AS guests
      FROM agg a
      FULL OUTER JOIN guests gs ON gs.day = a.day
    `),
    prisma.$queryRaw<{ day: string; count: number }[]>(Prisma.sql`
      SELECT to_char("createAt" AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS count
      FROM "User"
      WHERE "createAt" >= ${start}
      GROUP BY 1
    `),
  ]);

  const onlineMap = new Map(onlineRows.map((r) => [r.day, r]));
  const regMap = new Map(regRows.map((r) => [r.day, r.count]));

  // 补零生成连续逐日序列，保证热力图不断列
  const days: YearTrafficDay[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < TRAFFIC_HEATMAP_DAYS; i++) {
    const iso = cursor.toISOString().slice(0, 10);
    days.push({
      date: iso,
      onlineUsers: onlineMap.get(iso)?.users ?? 0,
      onlineGuests: onlineMap.get(iso)?.guests ?? 0,
      registrations: regMap.get(iso) ?? 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    startDate: days[0].date,
    endDate: days[days.length - 1].date,
    days,
  };
}
