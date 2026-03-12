import { NextRequest, NextResponse } from "next/server";
import { favoritesService } from "@/core/favorites/favorites.service";

export async function GET(req: NextRequest) {
  const podcastid = req.nextUrl.searchParams.get("podcastid");
  const userid = req.nextUrl.searchParams.get("userid");
  console.log("[GET /api/podcast/favorite/find-unique]", podcastid, userid);

  // 验证参数有效性
  if (!podcastid || !userid) {
    console.error("Invalid podcast ID or User ID", podcastid, userid);
    return NextResponse.json({
      success: false,
      message: "Invalid podcast ID or User ID",
      status: 400,
    });
  }
  try {
    const result = await favoritesService.checkPodcastFavorite({
      userId: userid,
      targetId: podcastid,
    });

    if (!result.data?.isFavorited) {
      return NextResponse.json({
        success: false,
        message: "Podcast favorite not found",
        podcast_favorite: null, // 为了保持向下兼容
      });
    }
    return NextResponse.json({
      success: true,
      message: "Podcast favorite found:",
      podcast_favorite: { isFavorited: true }, // 为了保持向下兼容
    });
  } catch (error) {
    console.error("[GET /api/podcast/favorite/find-unique]", error);
    return NextResponse.json({ error: "Internal Server Error", status: 500 });
  }
}
