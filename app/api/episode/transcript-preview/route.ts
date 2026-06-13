import { NextRequest, NextResponse } from "next/server";
import { fetchEpisodeById, mergeSubtitles } from "@/lib/data";
import { generateSignatureUrl } from "@/lib/oss";
import { auth } from "@/auth";

/**
 * GET /api/episode/transcript-preview?episodeid=xxx
 * Returns a limited preview of the bilingual transcript (max 4 subtitle pairs).
 * Available to any logged-in user (no premium requirement).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "请先登录" },
      { status: 401 },
    );
  }

  const episodeid = req.nextUrl.searchParams.get("episodeid");
  if (!episodeid) {
    return NextResponse.json(
      { success: false, error: "缺少 episodeid 参数" },
      { status: 400 },
    );
  }

  try {
    // 1. Fetch episode data
    const episode = await fetchEpisodeById(episodeid);
    if (!episode) {
      return NextResponse.json(
        { success: false, error: "未找到对应单集" },
        { status: 404 },
      );
    }

    // 2. Fetch merged subtitles
    const subtitles = await mergeSubtitles(episode);
    if (!subtitles || subtitles.length === 0) {
      return NextResponse.json(
        { success: false, error: "未找到字幕数据" },
        { status: 404 },
      );
    }

    // 3. Generate signed cover URL for the preview
    let coverUrl: string | undefined;
    if (episode.coverFileName) {
      try {
        coverUrl = await generateSignatureUrl(episode.coverFileName, 60 * 5);
      } catch {
        console.warn("[transcript-preview] Failed to get cover URL");
      }
    }

    // 4. Return limited preview data (max 4 subtitle pairs)
    return NextResponse.json({
      success: true,
      data: {
        podcastTitle: episode.podcast?.title || "远路播客",
        episodeTitle: episode.title,
        coverUrl,
        subtitles: subtitles.slice(0, 4).map((s) => ({
          textEn: s.textEn,
          textZh: s.textZh,
        })),
        totalSubtitles: subtitles.length,
      },
    });
  } catch (error: unknown) {
    console.error("[GET /api/episode/transcript-preview]", error);
    const errorMessage =
      error instanceof Error ? error.message : "预览数据获取失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
