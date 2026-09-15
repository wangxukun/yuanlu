import { NextRequest, NextResponse } from "next/server";
import { authWithMobile } from "@/core/auth/guard";
import { episodeService } from "@/core/episode/episode.service";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const podcastId = searchParams.get("podcastId");

  if (!podcastId) {
    return NextResponse.json(
      { success: false, error: "podcastId is required" },
      { status: 400 },
    );
  }

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const search = searchParams.get("search") || "";
  const sort = (searchParams.get("sort") === "asc" ? "asc" : "desc") as
    | "asc"
    | "desc";

  try {
    // Cookie 优先、移动端 Bearer Token 兜底（Android 端进度条/收藏态依赖 userId）
    const session = await authWithMobile();
    const userId = session?.user?.userid;

    const result = await episodeService.getPodcastEpisodes(podcastId, {
      page,
      limit,
      search,
      sort,
      userId,
      // [P1-4] 传入访问者会话，专享剧集媒体字段按访问权剥离
      viewer: session?.user ?? null,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[GET /api/episode/list-by-podcastid] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
