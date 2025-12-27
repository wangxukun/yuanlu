import { auth } from "@/auth";
import { statsService } from "@/core/stats/stats.service";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.userid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await statsService.getUserProfileStats(session.user.userid);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
