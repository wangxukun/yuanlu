import { statsService } from "@/core/stats/stats.service";
import { requireAuth } from "@/core/auth/guard";
import { NextResponse } from "next/server";

// requireAuth：Web Cookie 优先，移动端 Bearer Token 兜底（Android 端依赖）
export async function GET(request: Request) {
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }
  const session = guard.session;
  const weapp = new URL(request.url).searchParams.get("platform") === "weapp";

  try {
    const stats = await statsService.getUserProfileStats(
      session.user.userid,
      weapp,
    );
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
