import { NextRequest, NextResponse } from "next/server";
import { mergeSubtitles } from "@/lib/data";
import { episodeRepository } from "@/core/episode/episode.repository";
import { generateSignatureUrl } from "@/lib/oss";
import { requireAuth } from "@/core/auth/guard";

/**
 * GET /api/episode/transcript-preview?episodeid=xxx
 * Returns a limited preview of the bilingual transcript (max 4 subtitle pairs).
 * Available to any logged-in user (no premium requirement).
 * [T1.4] auth() 只认 NextAuth cookie，小程序/Android 走 Bearer JWT——
 * 换 requireAuth()（cookie 优先、Bearer 回落），401 响应体不变。
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  const episodeid = req.nextUrl.searchParams.get("episodeid");
  if (!episodeid) {
    return NextResponse.json(
      { success: false, error: "缺少 episodeid 参数" },
      { status: 400 },
    );
  }

  try {
    // 1. Fetch episode data
    const episode = await episodeRepository.findById(episodeid);
    if (!episode) {
      return NextResponse.json(
        { success: false, error: "未找到对应单集" },
        { status: 404 },
      );
    }

    if (episode.subtitleEnFileName) {
      episode.subtitleEnUrl = await generateSignatureUrl(
        episode.subtitleEnFileName,
        60 * 5,
      );
    }
    if (episode.subtitleZhFileName) {
      episode.subtitleZhUrl = await generateSignatureUrl(
        episode.subtitleZhFileName,
        60 * 5,
      );
    }
    if (episode.subtitleBilingualFileName) {
      episode.subtitleBilingualUrl = await generateSignatureUrl(
        episode.subtitleBilingualFileName,
        60 * 5,
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

    // 4. Return limited preview data (max 5 subtitle pairs)
    return NextResponse.json({
      success: true,
      data: {
        podcastTitle: episode.podcast?.title || "远路播客",
        episodeTitle: episode.title,
        coverUrl,
        subtitles: subtitles.slice(0, 5).map((s) => ({
          textEn: s.textEn,
          textCn: s.textCn,
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
