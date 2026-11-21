import { requireAuth } from "@/core/auth/guard";
import { getGoalProgress } from "@/core/stats/weekly-activity";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await getGoalProgress(auth.session.user.userid));
  } catch (error) {
    console.error("[GET /api/user/stats/goal-progress]", error);
    return NextResponse.json({ error: "学习进度暂未同步" }, { status: 500 });
  }
}
