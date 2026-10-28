import { NextRequest, NextResponse } from "next/server";
import { requireAuth, canAccessEpisode } from "@/core/auth/guard";
import prisma from "@/lib/prisma";
import { buildRealClipAudioDeps } from "@/core/corpus/clip-audio.deps";
import { clipAudioService } from "@/core/corpus/clip-audio.service";

/**
 * [RESHAPE T1.4] GET /api/scenes/[sceneid] — 微剧场详情（30 秒精研室数据源）。
 *
 * 200 { success, data: { scene, clipAudioUrl, clipOffset, clipDuration } }
 *   scene = { sceneid, episodeid, title, summaryZh, situationTag, cefrLevel,
 *             coverUrl, startTime, endTime, duration, clips[{...含 words}], deepDive }
 * clipAudioUrl：优先已缓存切片的签名 URL；未缓存时返回 null（客户端经
 * /api/clips/{sceneid}/audio 懒取，避免详情请求阻塞 FFmpeg 首切）。
 * 专享剧集语料需会员（与 /api/clips 同口径）。
 */
export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ sceneid: string }> },
) {
  const { sceneid } = await props.params;
  if (!sceneid) {
    return NextResponse.json(
      { success: false, error: "Missing scene id" },
      { status: 400 },
    );
  }

  try {
    const scene = await prisma.micro_scenes.findUnique({ where: { sceneid } });
    if (!scene) {
      return NextResponse.json(
        { success: false, code: "NOT_FOUND", message: "微剧场不存在" },
        { status: 404 },
      );
    }

    // 专享门禁（与 /api/clips/[id]/audio 同口径）
    const episode = await prisma.episode.findUnique({
      where: { episodeid: scene.episodeid },
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

    // 已缓存切片直接附签名 URL（懒切留给 /api/clips 网关，详情请求不阻塞）
    let clipAudioUrl: string | null = null;
    let clipOffset = scene.startTime;
    let clipDuration = scene.duration;
    if (scene.clipAudioKey) {
      const ensured = await clipAudioService
        .ensureClipAudio(sceneid, buildRealClipAudioDeps())
        .catch(() => null);
      if (ensured && ensured.ok) {
        clipAudioUrl = ensured.url;
        clipOffset = ensured.clipOffset;
        clipDuration = ensured.duration;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        scene: {
          sceneid: scene.sceneid,
          episodeid: scene.episodeid,
          title: scene.title,
          summaryZh: scene.summaryZh,
          situationTag: scene.situationTag,
          cefrLevel: scene.cefrLevel,
          coverUrl: scene.coverUrl,
          startTime: scene.startTime,
          endTime: scene.endTime,
          duration: scene.duration,
          clips: (scene.clipsJson as { clips?: unknown[] } | null)?.clips || [],
          deepDive: scene.deepDiveJson || null,
        },
        clipAudioUrl,
        clipOffset,
        clipDuration,
      },
    });
  } catch (error) {
    console.error("[GET /api/scenes/[sceneid]]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch scene" },
      { status: 500 },
    );
  }
}
