import { achievementsService } from "@/core/achievements/achievements.service";
import { requireAuth } from "@/core/auth/guard";
import { NextResponse } from "next/server";

// requireAuth：Web Cookie 优先，移动端 Bearer Token 兜底（Android 端依赖）
export async function GET() {
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }
  const session = guard.session;

  try {
    const data = await achievementsService.getUserAchievements(
      session.user.userid,
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch achievements:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
