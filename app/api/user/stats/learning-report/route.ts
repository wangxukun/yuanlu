import { getLearningReport } from "@/core/stats/learning-report.service";
import { isPremiumUser, requireAuth } from "@/core/auth/guard";
import { NextResponse } from "next/server";

// requireAuth：Web Cookie 优先，移动端 Bearer Token 兜底（小程序端依赖）
// 权限差异在服务端切片：免费层只返回近 7 天，PRO 返回近 365 天
export async function GET() {
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }
  const session = guard.session;

  try {
    const isPremium = await isPremiumUser(session.user);
    const data = await getLearningReport(session.user.userid, isPremium);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching learning report:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
