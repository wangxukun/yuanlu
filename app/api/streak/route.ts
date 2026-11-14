import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { getStreakStatus } from "@/core/streak/weapp-streak.service";

/**
 * [weapp-backend] GET /api/streak — 小程序每日学习连胜状态。
 * 返回 { streakDays, ignitedToday, percentile }（跟读开口+手动点亮口径，
 * 与网站版收听打卡 user_daily_activity 完全隔离）。段位/里程碑/7 日火苗链
 * 由端上按 B 参照派生。
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
