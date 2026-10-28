import { NextRequest, NextResponse } from "next/server";
import { requireAuth, canAccessEpisode } from "@/core/auth/guard";
import prisma from "@/lib/prisma";
import { buildRealClipAudioDeps } from "@/core/corpus/clip-audio.deps";
import { clipAudioService } from "@/core/corpus/clip-audio.service";

/**
 * [RESHAPE T1.3] GET /api/clips/[id]/audio — 短音频物理切片网关。
 *
 * id = corpus_clips.clipid（单句 6–15s）或 micro_scenes.sceneid（微剧场 ≤40s）。
 * 命中即返回 { success, data: { url, duration, clipOffset } }（weapp
 * audio-clip 切片直连协议，test-acoustic-microscope 锁死）；首访经 FFmpeg
 * 物理切片并永久缓存 OSS yuanlu/clips/ 前缀——任何响应都不携带整集音频
 * URL（红线 2）。专享剧集语料需会员（canAccessEpisode 同一口径）。
 */
export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: "Missing clip id" },
      { status: 400 },
    );
  }

  try {
    // 专享门禁：切片归属剧集为专享且访问者无权限 → 403（与剧集页同口径）
    const clipOwned = await prisma.corpus_clips.findUnique({
      where: { clipid: id },
      select: { episodeid: true },
    });
    const sceneOwned = clipOwned
      ? null
      : await prisma.micro_scenes.findUnique({
          where: { sceneid: id },
          select: { episodeid: true },
        });
    const episodeid = clipOwned?.episodeid ?? sceneOwned?.episodeid ?? null;
    if (!episodeid) {
      return NextResponse.json(
        { success: false, code: "NOT_FOUND", message: "切片不存在" },
        { status: 404 },
      );
    }
    const episode = await prisma.episode.findUnique({
      where: { episodeid },
      select: { isExclusive: true },
    });
    if (episode?.isExclusive) {
      const guard = await requireAuth();
      if (!guard.ok || !(await canAccessEpisode(guard.session.user, episode))) {
        return NextResponse.json(
          {
            success: false,
            code: "PREMIUM_REQUIRED",
            message: "该原声语料为会员专享",
          },
          { status: 403 },
        );
      }
    }

    const result = await clipAudioService.ensureClipAudio(
      id,
      buildRealClipAudioDeps(),
    );
    if (!result.ok) {
      const status =
        result.code === "NOT_FOUND"
          ? 404
          : result.code === "SLICE_UNAVAILABLE" ||
              result.code === "NO_SOURCE_AUDIO"
            ? 503
            : 422;
      return NextResponse.json(
        {
          success: false,
          code: result.code,
          message: result.message ?? "切片不可用",
        },
        { status },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        duration: result.duration,
        clipOffset: result.clipOffset,
        cached: result.cached,
      },
    });
  } catch (error) {
    console.error("[GET /api/clips/[id]/audio]", error);
    return NextResponse.json(
      { success: false, error: "Failed to slice clip audio" },
      { status: 500 },
    );
  }
}
