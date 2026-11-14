import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { decoratePublicUsers } from "@/core/social/public-user";
import {
  chinaToday,
  chinaDayOf,
  addUTCDays,
  subUTCDays,
  isSameUTCDay,
} from "@/core/utils/china-date";

/**
 * [weapp-backend] 发音达人日榜/周榜服务（自 app/api/speech/leaderboard/route.ts
 * 抽出并扩展 home 排行榜装饰）。
 *
 * 旧契约字段（review 页 parseLeaderboard 消费）一字不动：entries[]
 * {userid,nickname,avatar,evalCount,avgScore} + me{rank,evalCount,avgScore}|null。
 * home 扩展（yl-weapp 排行榜 tab，固定 period=daily&metric=count）：
 *   entries[] += {streakDays,badge,featuredSentence,featuredClipId,likes,
 *                 likedByMe,firstName,lastActive}
 *   data += {totalParticipants,myEntry(未上榜也给全量),nextTargetDiff,nextTargetName}
 *
 * 聚合口径与排序沿用 4263c3b：实时 groupBy speech_recognition，日界=中国时区，
 * score 榜 ≥5 次防霸榜，count 榜同分按 userid 字典序。点赞（social_likes
 * LB_ENTRY）固定"今日"窗口——home 榜即日榜，获赞随日落清零重计。
 */

export type LbPeriod = "daily" | "weekly";
export type LbMetric = "score" | "count";

export interface LbEntry {
  // ── 旧契约 ──
  userid: string;
  nickname: string;
  avatar: string;
  evalCount: number;
  avgScore: number;
  // ── home 扩展装饰 ──
  streakDays: number;
  badge: string;
  featuredSentence: string | null;
  featuredClipId: string | null;
  likes: number;
  likedByMe: boolean;
  firstName: string;
  lastActive: string | null;
  rank: number;
}

export interface LeaderboardData {
  period: LbPeriod;
  metric: LbMetric;
  entries: LbEntry[];
  me: { rank: number; evalCount: number; avgScore: number } | null;
  totalParticipants: number;
  myEntry: LbEntry | null;
  nextTargetDiff: number | null;
  nextTargetName: string | null;
}

interface RawFeatured {
  userid: string;
  overallScore: number | null;
  targetText: string | null;
  subtitleId: number | null;
  episodeid: string | null;
}

function relativeTime(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

function badgeOf(rank: number, evalCount: number): string {
  if (rank === 1) return "🏆 原声复刻传奇";
  if (rank === 2) return "🎯 稳如老狼";
  if (rank === 3) return "🔥 势不可挡";
  if (evalCount >= 5) return "⚡ 今日满贯先锋";
  return "";
}

/** 批量 streak：与 stats.service.calculateStreak 同口径（isActive 连续日，止于今天/昨天） */
function batchStreak(
  activities: { userid: string; date: Date }[],
): Map<string, number> {
  const byUser = new Map<string, Date[]>();
  for (const a of activities) {
    const list = byUser.get(a.userid) ?? [];
    list.push(a.date);
    byUser.set(a.userid, list);
  }
  const today = chinaToday();
  const yesterday = subUTCDays(today, 1);
  const out = new Map<string, number>();
  for (const [userid, dates] of byUser) {
    dates.sort((a, b) => b.getTime() - a.getTime());
    if (!dates.length) {
      out.set(userid, 0);
      continue;
    }
    const latest = chinaDayOf(dates[0]);
    if (!isSameUTCDay(latest, today) && !isSameUTCDay(latest, yesterday)) {
      out.set(userid, 0);
      continue;
    }
    let streak = 0;
    let cursor = latest;
    for (const d of dates) {
      const day = chinaDayOf(d);
      if (isSameUTCDay(day, cursor)) {
        streak++;
        cursor = subUTCDays(cursor, 1);
      } else {
        break;
      }
    }
    out.set(userid, streak);
  }
  return out;
}

export async function getLeaderboard(
  myUserid: string,
  period: LbPeriod,
  metric: LbMetric,
): Promise<LeaderboardData> {
  let start = new Date();
  let end: Date | undefined;
  if (period === "daily") {
    start = new Date(chinaDayOf(start).getTime() - 8 * 3600000);
    end = addUTCDays(start, 1);
  } else {
    start.setDate(start.getDate() - 7);
  }
  const dateWhere = { gte: start, ...(end ? { lt: end } : {}) };
  const dateFilter = end
    ? Prisma.sql`AND "recognitionDate" >= ${start} AND "recognitionDate" < ${end}`
    : Prisma.sql`AND "recognitionDate" >= ${start}`;

  const grouped = await prisma.speech_recognition.groupBy({
    by: ["userid"],
    where: { recognitionDate: dateWhere, userid: { not: null } },
    _count: { recognitionid: true },
    _avg: { overallScore: true },
  });

  const rows = grouped
    .filter((g) => g.userid)
    .map((g) => ({
      userid: g.userid as string,
      evalCount: g._count.recognitionid,
      avgScore: g._avg.overallScore ?? 0,
    }));

  const sorted =
    metric === "count"
      ? [...rows].sort(
          (a, b) =>
            b.evalCount - a.evalCount ||
            (a.userid < b.userid ? -1 : a.userid > b.userid ? 1 : 0),
        )
      : [...rows]
          .filter((r) => r.evalCount >= 5)
          .sort((a, b) => b.avgScore - a.avgScore || b.evalCount - a.evalCount);

  const myRankIndex = sorted.findIndex((r) => r.userid === myUserid);
  const top = sorted.slice(0, 20);
  // 装饰集合：top20 + 我 + 紧邻我上一名（nextTargetName 需要）
  const decorateIds = new Set(top.map((r) => r.userid));
  decorateIds.add(myUserid);
  const prevRow = myRankIndex > 0 ? sorted[myRankIndex - 1] : null;
  if (prevRow) decorateIds.add(prevRow.userid);
  const ids = [...decorateIds];

  const rankOf = new Map(sorted.map((r, i) => [r.userid, i + 1]));

  const [users, activities, featuredRaw, lastActiveRaw, likeRows, myLikeRows] =
    await Promise.all([
      decoratePublicUsers(ids),
      // streak 窗口 90 天足够覆盖任意显示合理的连续天数
      prisma.user_daily_activity.findMany({
        where: {
          userid: { in: ids },
          isActive: true,
          date: { gte: subUTCDays(chinaToday(), 90) },
        },
        select: { userid: true, date: true },
      }),
      // 每用户窗口内最高分一条（代表作句 + 反查切片）
      prisma.$queryRaw<RawFeatured[]>(Prisma.sql`
        SELECT DISTINCT ON (userid) userid, "overallScore", "targetText", "subtitleId", "episodeid"
        FROM speech_recognition
        WHERE userid = ANY(${ids}::text[]) ${dateFilter}
          AND "overallScore" IS NOT NULL
        ORDER BY userid, "overallScore" DESC`),
      prisma.$queryRaw<{ userid: string; last: Date }[]>(Prisma.sql`
        SELECT userid, MAX("recognitionDate") AS last
        FROM speech_recognition
        WHERE userid = ANY(${ids}::text[]) ${dateFilter}
        GROUP BY userid`),
      prisma.social_likes.groupBy({
        by: ["targetId"],
        where: {
          targetType: "LB_ENTRY",
          targetId: { in: ids },
          likeDate: chinaToday(),
        },
        _count: { id: true },
      }),
      prisma.social_likes.findMany({
        where: {
          likerUserid: myUserid,
          targetType: "LB_ENTRY",
          targetId: { in: ids },
          likeDate: chinaToday(),
        },
        select: { targetId: true },
      }),
    ]);

  const streaks = batchStreak(activities);
  const featuredByUser = new Map(featuredRaw.map((r) => [r.userid, r]));
  const lastActiveByUser = new Map(
    lastActiveRaw.map((r) => [r.userid, r.last]),
  );
  const likeCount = new Map(likeRows.map((r) => [r.targetId, r._count.id]));
  const likedSet = new Set(myLikeRows.map((r) => r.targetId));

  // 代表作句反查 corpus 切片（挑战同款直跳）：(episodeid, subtitleId) 对批量命中
  const pairs = [
    ...new Set(
      featuredRaw
        .filter((r) => r.episodeid && r.subtitleId != null)
        .map((r) => `${r.episodeid}|${r.subtitleId}`),
    ),
  ];
  const clipMap = new Map<string, string>();
  if (pairs.length) {
    const clips = await prisma.corpus_clips.findMany({
      where: {
        OR: pairs.map((p) => {
          const [episodeid, subtitleId] = p.split("|");
          return { episodeid, subtitleId: Number(subtitleId) };
        }),
      },
      select: { clipid: true, episodeid: true, subtitleId: true },
    });
    for (const c of clips)
      clipMap.set(`${c.episodeid}|${c.subtitleId}`, c.clipid);
  }

  const decorateEntry = (
    row: { userid: string; evalCount: number; avgScore: number },
    rank: number,
  ): LbEntry => {
    const u = users.get(row.userid);
    const nickname = u?.nickname ?? `用户_${row.userid.slice(-4)}`;
    const featured = featuredByUser.get(row.userid);
    return {
      userid: row.userid,
      nickname,
      avatar: u?.avatar ?? "/static/images/default-avatar.png",
      evalCount: row.evalCount,
      avgScore: Math.round(row.avgScore),
      streakDays: streaks.get(row.userid) ?? 0,
      badge: badgeOf(rank, row.evalCount),
      featuredSentence: featured?.targetText ?? null,
      featuredClipId:
        featured?.episodeid && featured?.subtitleId != null
          ? (clipMap.get(`${featured.episodeid}|${featured.subtitleId}`) ??
            null)
          : null,
      likes: likeCount.get(row.userid) ?? 0,
      likedByMe: likedSet.has(row.userid),
      firstName: nickname.split(" ")[0],
      lastActive: lastActiveByUser.has(row.userid)
        ? relativeTime(lastActiveByUser.get(row.userid)!)
        : null,
      rank,
    };
  };

  const entries = top.map((r) => decorateEntry(r, rankOf.get(r.userid) ?? 0));

  // 旧契约 me：未上榜为 null（review 页依赖此语义）
  const myRow = sorted.find((r) => r.userid === myUserid);
  const me = myRow
    ? {
        rank: myRankIndex + 1,
        evalCount: myRow.evalCount,
        avgScore: Math.round(myRow.avgScore),
      }
    : null;

  // home 扩展 myEntry：无评测也给全量（rank 榜尾+1）
  const myEntry = myRow
    ? decorateEntry(myRow, myRankIndex + 1)
    : decorateEntry(
        { userid: myUserid, evalCount: 0, avgScore: 0 },
        rows.length + 1,
      );

  let nextTargetDiff: number | null = null;
  let nextTargetName: string | null = null;
  if (prevRow && myRow) {
    nextTargetDiff =
      metric === "count"
        ? prevRow.evalCount - myRow.evalCount
        : Math.round(prevRow.avgScore - myRow.avgScore);
    nextTargetName = users.get(prevRow.userid)?.nickname.split(" ")[0] ?? null;
  }

  return {
    period,
    metric,
    entries,
    me,
    totalParticipants: rows.length,
    myEntry,
    nextTargetDiff,
    nextTargetName,
  };
}

/** POST /api/speech/leaderboard/cheer —— 点赞（当日幂等，禁自赞） */
export async function cheerEntry(
  myUserid: string,
  targetUserid: string,
): Promise<
  | { ok: true; data: { likes: number; likedByMe: boolean } }
  | { ok: false; code: string; message?: string }
> {
  if (targetUserid === myUserid) {
    return { ok: false, code: "SELF_CHEER", message: "不能给自己点赞哦" };
  }
  const target = await prisma.user.findUnique({
    where: { userid: targetUserid },
    select: { userid: true },
  });
  if (!target) {
    return { ok: false, code: "USER_NOT_FOUND", message: "用户不存在" };
  }

  const today = chinaToday();
  await prisma.social_likes
    .create({
      data: {
        likerUserid: myUserid,
        targetType: "LB_ENTRY",
        targetId: targetUserid,
        likeDate: today,
      },
    })
    .catch(() => undefined); // 当日重复点赞幂等

  const [row] = await prisma.social_likes.groupBy({
    by: ["targetId"],
    where: { targetType: "LB_ENTRY", targetId: targetUserid, likeDate: today },
    _count: { id: true },
  });
  return { ok: true, data: { likes: row?._count.id ?? 0, likedByMe: true } };
}
