import { auth } from "@/auth";
import { achievementsService } from "@/core/achievements/achievements.service";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.userid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
