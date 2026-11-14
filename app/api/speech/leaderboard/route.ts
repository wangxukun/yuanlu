import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { getLeaderboard } from "@/core/speech/leaderboard.service";

/**
 * GET /api/speech/leaderboard?period=weekly|daily&metric=score|count
 *
 * 发音达人排行榜（VOICE-EVALUATION 阶段四·任务2，社区功能、对所有用户免费）：
 * - period: 统计周期（daily=今日 / weekly=近 7 天，默认 weekly）
 * - metric: 排名依据（score=平均综合分，需 ≥5 次评测防止单次满分霸榜 /
 *           count=练习次数，默认 score）
 * - 返回 top 20 与当前用户自己的排名（未上榜也给"我的成绩"）
 *
 * [weapp-backend] 聚合与旧契约（entries 五字段 + me）抽至
 * core/speech/leaderboard.service.ts；home 排行榜扩展装饰（streakDays/
 * badge/featuredSentence/likes/myEntry/nextTarget* 等）见 service 头注。
 */
export async function GET(req: NextRequest) {
  // requireAuth：Web Cookie 与移动端 Bearer 双口径
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  const period =
    req.nextUrl.searchParams.get("period") === "daily" ? "daily" : "weekly";
  const metric =
    req.nextUrl.searchParams.get("metric") === "count" ? "count" : "score";

  try {
    const data = await getLeaderboard(
      authResult.session.user.userid,
      period,
      metric,
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[GET /api/speech/leaderboard]", error);
    return NextResponse.json(
      { error: "Internal processing error" },
      { status: 500 },
    );
  }
}
