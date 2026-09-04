import { statsService } from "@/core/stats/stats.service";
import { requireAuth } from "@/core/auth/guard";
import { NextRequest, NextResponse } from "next/server";

// requireAuth：Web Cookie 优先，移动端 Bearer Token 兜底（Android 端依赖）
export async function GET(request: NextRequest) {
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }
  const session = guard.session;

  try {
    const { searchParams } = request.nextUrl;
    const weekOffset = parseInt(searchParams.get("weekOffset") || "0", 10);

    const data = await statsService.getWeeklyActivityChart(
      session.user.userid,
      isNaN(weekOffset) ? 0 : weekOffset,
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching weekly activity:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
