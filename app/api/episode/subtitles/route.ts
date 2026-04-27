import { NextRequest, NextResponse } from "next/server";
import { fetchEpisodeById, mergeSubtitles } from "@/lib/data";

/**
 * GET /api/episode/subtitles?id=xxx
 * Returns merged bilingual subtitles for a given episode.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing episode id" }, { status: 400 });
  }

  try {
    const episode = await fetchEpisodeById(id);
    const subtitles = await mergeSubtitles(episode);
    return NextResponse.json({
      success: true,
      data: subtitles,
    });
  } catch (error) {
    console.error("[GET /api/episode/subtitles]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subtitles" },
      { status: 500 },
    );
  }
}
