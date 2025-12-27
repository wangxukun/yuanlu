// yuanlu/app/api/user/history/recent/route.ts
import { auth } from "@/auth";
import { listeningHistoryService } from "@/core/listening-history/listening-history.service";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.userid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 获取最近 3 条记录
    const recentHistory = await listeningHistoryService.getRecentHistory(
      session.user.userid,
      3,
    );
    return NextResponse.json(recentHistory);
  } catch (error) {
    console.error("Failed to fetch recent history:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
