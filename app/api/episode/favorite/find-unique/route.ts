import { NextRequest, NextResponse } from "next/server";
import { favoritesService } from "@/core/favorites/favorites.service";

export async function GET(req: NextRequest) {
  const episodeid = req.nextUrl.searchParams.get("episodeid");
  const userid = req.nextUrl.searchParams.get("userid");
  console.log("[GET /api/episode/favorite/find-unique]", episodeid, userid);

  // 验证参数有效性
  if (!episodeid || !userid) {
    console.error("Invalid episode ID or User ID", episodeid, userid);
    return NextResponse.json({
      success: false,
      message: "Invalid episode ID or User ID",
      status: 400,
    });
  }
  try {
    const result = await favoritesService.checkEpisodeFavorite({
      userId: userid,
      targetId: episodeid,
    });

    if (!result.data?.isFavorited) {
      return NextResponse.json({
        success: false,
        message: "Podcast favorite not found",
        episode_favorite: null, // 为了保持向下兼容
      });
    }
    return NextResponse.json({
      success: true,
      message: "Episode favorite found:",
      episode_favorite: { isFavorited: true }, // 为了保持向下兼容
    });
  } catch (error) {
    console.error("[GET /api/episode/favorite/find-unique]", error);
    return NextResponse.json({ error: "Internal Server Error", status: 500 });
  }
}
