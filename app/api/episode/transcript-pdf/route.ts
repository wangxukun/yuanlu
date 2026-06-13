import { NextRequest, NextResponse } from "next/server";
import { fetchEpisodeById, mergeSubtitles } from "@/lib/data";
import { generateSignatureUrl } from "@/lib/oss";
import { generateTranscriptPdf } from "@/core/transcript-pdf/transcript-pdf.service";

import { requirePremium } from "@/core/auth/guard";

/**
 * GET /api/episode/transcript-pdf?episodeid=xxx
 * Generates and returns a beautifully formatted bilingual transcript PDF.
 */
export async function GET(req: NextRequest) {
  const authResult = await requirePremium();
  if (!authResult.ok) return authResult.response;

  const episodeid = req.nextUrl.searchParams.get("episodeid");
  const format = req.nextUrl.searchParams.get("format") as "A4" | "A5" | null;

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
        { success: false, error: "未找到字幕数据，无法生成文稿" },
        { status: 404 },
      );
    }

    // 3. Generate signed cover URL
    let coverUrl: string | undefined;
    if (episode.coverFileName) {
      try {
        coverUrl = await generateSignatureUrl(episode.coverFileName, 60 * 5);
      } catch {
        console.warn("[transcript-pdf] Failed to get cover URL");
      }
    }

    // 4. Generate PDF
    const pdfBuffer = await generateTranscriptPdf({
      episodeTitle: episode.title,
      podcastTitle: episode.podcast?.title || "远路播客",
      coverUrl,
      subtitles,
      format: format === "A5" ? "A5" : "A4",
    });

    // 5. Return PDF response
    const safeFilename = encodeURIComponent(`${episode.title} - 文稿.pdf`);
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${safeFilename}`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error: unknown) {
    console.error("[GET /api/episode/transcript-pdf]", error);
    const errorMessage =
      error instanceof Error ? error.message : "PDF 生成失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
