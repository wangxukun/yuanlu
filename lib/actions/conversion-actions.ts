"use server";

import prisma from "@/lib/prisma";
import { requireAdminAction } from "@/core/auth/guard";
import { Prisma } from "@prisma/client";

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
