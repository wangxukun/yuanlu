import { auth } from "@/auth";
import { statsService } from "@/core/stats/stats.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.userid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
