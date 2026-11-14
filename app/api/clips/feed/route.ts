import { NextRequest, NextResponse } from "next/server";
import {
  getReelsFeed,
  parseLevels,
  parseRingCursor,
} from "@/core/corpus/reels-feed.service";

/**
 * [REELS] GET /api/clips/feed — 原声微流切片流（SoundBite Reels）。
 *
 * Query:
 *   - Legacy mode (default): page=1&pageSize=12&level=B1,B2
 *   - Ring cursor mode (optional): cursor=<hex>&pageSize=12&level=B1,B2
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(
      30,
      Math.max(1, Number(sp.get("pageSize")) || 12),
    );
    const levels = parseLevels(sp.get("level"));
    const cursor = parseRingCursor(sp.get("cursor"));

    const data = await getReelsFeed({
      page,
      pageSize,
      levels,
      cursor,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[GET /api/clips/feed]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch clips feed" },
      { status: 500 },
    );
  }
}
