/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { isPremiumUser } from "@/core/auth/guard";

export async function GET() {
  const session = await auth();
  if (!session?.user?.userid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 诊断报告为 PRO 会员功能（当前无调用方，防御性挂墙保持与弱项本一致）
  if (!(await isPremiumUser(session.user))) {
    return NextResponse.json(
      { error: "Premium membership required" },
      { status: 403 },
    );
  }

  try {
    const userProfile = await prisma.user_profile.findUnique({
      where: { userid: session.user.userid },
      select: { phonemeStats: true },
    });

    const stats: any = userProfile?.phonemeStats || {};
    const formattedStats = Object.keys(stats).map((phoneme) => {
      const data = stats[phoneme];
      const avgScore = data.count > 0 ? data.totalScore / data.count : 0;
      return {
        phoneme,
        avgScore: Math.round(avgScore),
        count: data.count,
        lowScoreCount: data.lowScoreCount,
      };
    });

    // Sort by avgScore ascending to easily find weak spots
    formattedStats.sort((a, b) => a.avgScore - b.avgScore);

    return NextResponse.json({ success: true, data: formattedStats });
  } catch (error) {
    console.error("Diagnostic API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch diagnostic" },
      { status: 500 },
    );
  }
}
