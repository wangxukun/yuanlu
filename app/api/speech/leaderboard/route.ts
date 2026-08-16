import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { generateSignatureUrl } from "@/lib/oss";

/**
 * GET /api/speech/leaderboard?period=weekly|daily&metric=score|count
 *
 * 发音达人排行榜（VOICE-EVALUATION 阶段四·任务2，社区功能、对所有用户免费）：
 * - period: 统计周期（daily=今日 / weekly=近 7 天，默认 weekly）
 * - metric: 排名依据（score=平均综合分，需 ≥5 次评测防止单次满分霸榜 /
 *           count=练习次数，默认 score）
 * - 返回 top 20 与当前用户自己的排名（未上榜也给"我的成绩"）
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.userid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const period =
    req.nextUrl.searchParams.get("period") === "daily" ? "daily" : "weekly";
  const metric =
    req.nextUrl.searchParams.get("metric") === "count" ? "count" : "score";

  const start = new Date();
  if (period === "daily") {
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(start.getDate() - 7);
  }

  try {
    const grouped = await prisma.speech_recognition.groupBy({
      by: ["userid"],
      where: { recognitionDate: { gte: start }, userid: { not: null } },
      _count: { recognitionid: true },
      _avg: { overallScore: true },
    });

    // 组装行并按指标排序
    const rows = grouped
      .filter((g) => g.userid)
      .map((g) => ({
        userid: g.userid as string,
        evalCount: g._count.recognitionid,
        avgScore: g._avg.overallScore ?? 0,
      }));

    const sorted =
      metric === "count"
        ? [...rows].sort((a, b) => b.evalCount - a.evalCount)
        : [...rows]
            .filter((r) => r.evalCount >= 5) // 平均分榜需至少 5 次评测
            .sort(
              (a, b) => b.avgScore - a.avgScore || b.evalCount - a.evalCount,
            );

    const myUserId = session.user.userid;
    const myRankIndex = sorted.findIndex((r) => r.userid === myUserId);
    const top = sorted.slice(0, 20);

    // 补齐用户资料（昵称/头像）
    const userids = new Set<string>(top.map((r) => r.userid));
    if (myRankIndex === -1) userids.add(myUserId); // 未上榜也需要"我的成绩"
    const users = await prisma.user.findMany({
      where: { userid: { in: [...userids] } },
      select: {
        userid: true,
        email: true,
        phone: true,
        user_profile: {
          select: { nickname: true, avatarFileName: true, avatarUrl: true },
        },
      },
    });
    const userMap = new Map(users.map((u) => [u.userid, u]));

    const decorate = async (row: {
      userid: string;
      evalCount: number;
      avgScore: number;
    }) => {
      const u = userMap.get(row.userid);
      let avatar = "/static/images/default-avatar.png";
      const profile = u?.user_profile;
      if (profile?.avatarFileName) {
        avatar = await generateSignatureUrl(profile.avatarFileName, 3600 * 3)
          .then((url: string) => url || avatar)
          .catch(() => avatar);
      } else if (
        profile?.avatarUrl &&
        profile.avatarUrl !== "default_avatar_url"
      ) {
        avatar = profile.avatarUrl;
      }

      let nickname = profile?.nickname;
      if (!nickname) {
        if (u?.email) {
          nickname = u.email.split("@")[0];
        } else if (u?.phone && u.phone.length >= 4) {
          nickname = `用户_${u.phone.slice(-4)}`;
        } else {
          nickname = `用户_${row.userid.slice(-4)}`;
        }
      }

      return {
        userid: row.userid,
        nickname,
        avatar,
        evalCount: row.evalCount,
        avgScore: Math.round(row.avgScore),
      };
    };

    const entries = await Promise.all(top.map(decorate));

    let me: {
      rank: number;
      evalCount: number;
      avgScore: number;
    } | null = null;
    const myRow = sorted.find((r) => r.userid === myUserId);
    if (myRow) {
      me = {
        rank: myRankIndex + 1,
        evalCount: myRow.evalCount,
        avgScore: Math.round(myRow.avgScore),
      };
    }

    return NextResponse.json({
      success: true,
      data: { period, metric, entries, me },
    });
  } catch (error) {
    console.error("[GET /api/speech/leaderboard]", error);
    return NextResponse.json(
      { error: "Internal processing error" },
      { status: 500 },
    );
  }
}
