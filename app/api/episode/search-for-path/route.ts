import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { episodeService } from "@/core/episode/episode.service";

// 添加剧集弹窗的剧集搜索（移动端）：
// 包装 episodeService.searchForLearningPath（标题/描述模糊匹配 published 剧集，
// 最多 20 条，封面已签名），对齐 Android GET api/episode/search-for-path 契约。
export async function GET(request: NextRequest) {
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }

  const query = (request.nextUrl.searchParams.get("query") ?? "").trim();
  if (!query) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const results = await episodeService.searchForLearningPath(query);
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Error searching episodes for learning path:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 },
    );
  }
}
