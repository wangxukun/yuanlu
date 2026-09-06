import { favoritesService } from "@/core/favorites/favorites.service";
import { requireAuth } from "@/core/auth/guard";
import { NextResponse } from "next/server";

// 我的收藏列表（移动端）：Web 页面 /library/favorites 走服务端直渲，
// 该路由把同一 favoritesService 暴露为 HTTP 接口供 Android 端拉取。
// requireAuth：Web Cookie 优先，移动端 Bearer Token 兜底。
export async function GET() {
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }

  const userId = guard.session.user.userid;

  try {
    const [podcasts, episodes] = await Promise.all([
      favoritesService.getFavoriteSeries(userId),
      favoritesService.getFavoriteEpisodes(userId),
    ]);

    return NextResponse.json({
      success: true,
      data: { podcasts, episodes },
    });
  } catch (error) {
    console.error("Error fetching user favorites:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 },
    );
  }
}
