import { NextRequest, NextResponse } from "next/server";
import { fetchEpisodeById, mergeSubtitles } from "@/lib/data";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateSignatureUrl } from "@/lib/oss";
import { canAccessEpisode } from "@/core/auth/guard";

/**
 * GET /api/episode/subtitles?id=xxx
 * Returns merged bilingual subtitles for a given episode.
 *
 * 登录用户额外返回 audioUrl（OSS 签名直链），供字幕对齐的原声片段播放
 * （与语音评测的原声播放同源：直连 OSS 精确 seek，不走 audio-proxy）。
 * 会员专享剧集对无权限用户不签发音频直链。
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing episode id" }, { status: 400 });
  }

  try {
    const episode = await fetchEpisodeById(id);
    let subtitles = await mergeSubtitles(episode);

    const session = await auth();
    let audioUrl: string | null = null;

    if (session?.user?.userid) {
      const ep = await prisma.episode.findUnique({
        where: { episodeid: id },
        select: { audioFileName: true, audioUrl: true, isExclusive: true },
      });
      if (ep && (await canAccessEpisode(session.user, ep))) {
        audioUrl = ep.audioFileName
          ? await generateSignatureUrl(ep.audioFileName, 3600 * 3).catch(
              () => ep.audioUrl || "",
            )
          : ep.audioUrl || "";
        if (!audioUrl) audioUrl = null;
      }
    } else {
      subtitles = subtitles.filter((sub) => sub.start < 180);
    }

    return NextResponse.json({
      success: true,
      data: subtitles,
      audioUrl,
    });
  } catch (error) {
    console.error("[GET /api/episode/subtitles]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subtitles" },
      { status: 500 },
    );
  }
}
