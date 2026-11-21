import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { getStreakStatus } from "@/core/streak/weapp-streak.service";

/**
 * [weapp-backend] GET /api/streak — 小程序每日学习连胜状态。
 * 返回今日收听目标和进度、实际点亮的七日记录、连胜天数及百分位。
 */
export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  try {
    const data = await getStreakStatus(authResult.session.user.userid);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[GET /api/streak]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch streak" },
      { status: 500 },
    );
  }
}
