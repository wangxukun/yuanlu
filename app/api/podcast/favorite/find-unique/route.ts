import { NextRequest, NextResponse } from "next/server";
import { favoritesService } from "@/core/favorites/favorites.service";
import { requireAuth } from "@/core/auth/guard";

export async function GET(req: NextRequest) {
  // [B2] 统一以当前会话用户决定归属；兼容老客户端传 userid，但禁止跨号查询他人收藏
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;
  const sessionUserId = authResult.session.user.userid;

  const podcastid = req.nextUrl.searchParams.get("podcastid");
  const clientUserId = req.nextUrl.searchParams.get("userid");

  if (!podcastid) {
    return NextResponse.json({
      success: false,
      message: "Invalid podcast ID",
      status: 400,
    });
  }
  if (clientUserId && clientUserId !== sessionUserId) {
    return NextResponse.json(
      { success: false, message: "无权查询他人收藏", status: 403 },
      { status: 403 },
    );
  }
  try {
    const result = await favoritesService.checkPodcastFavorite({
      userId: sessionUserId,
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
