/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.userid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
