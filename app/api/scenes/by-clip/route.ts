import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * [RESHAPE T5.2] GET /api/scenes/by-clip?episodeid=&subtitleId=（或 &t= 时间戳秒）
 * 反查包含该字幕句（或覆盖该时间点）的微剧场 → { success, data: { sceneid, nearest? } }。
 * 供小程序复习中心「原声出处胶囊」与主页处方切片卡直达微剧场精研室。
 * 未精确命中（groupScenes 弃用的过短句桶，约 3.8%）→ 返回同集时间最近的
 * 微剧场（nearest=true），避免客户端回落整集播放；仅零场景剧集才 404。
 * 只读、无鉴权（sceneid 非敏感，专享拦截在 /api/scenes/[sceneid] 与
 * /api/clips 统一口径）。
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const episodeid = (sp.get("episodeid") || "").trim();
    const subtitleId = Number(sp.get("subtitleId"));
    const t = Number(sp.get("t"));
    if (!episodeid || (!Number.isInteger(subtitleId) && !isFinite(t))) {
      return NextResponse.json(
        { success: false, message: "缺少 episodeid 与 subtitleId/t 参数" },
        { status: 400 },
      );
    }

    const scenes = await prisma.micro_scenes.findMany({
      where: { episodeid },
      select: {
        sceneid: true,
        startTime: true,
        endTime: true,
        clipsJson: true,
      },
      orderBy: { startTime: "asc" },
    });

    for (const scene of scenes) {
      if (Number.isInteger(subtitleId)) {
        const clips = (
          scene.clipsJson as { clips?: Array<{ subtitleId?: number }> } | null
        )?.clips;
        if (
          Array.isArray(clips) &&
          clips.some((c) => c && c.subtitleId === subtitleId)
        ) {
          return NextResponse.json({
            success: true,
            data: { sceneid: scene.sceneid },
          });
        }
      }
      if (isFinite(t) && t >= scene.startTime && t <= scene.endTime) {
        return NextResponse.json({
          success: true,
          data: { sceneid: scene.sceneid },
        });
      }
    }

    // 未精确命中：同集时间上最近的微剧场兜底（实测切片场景覆盖率 96.2%，
    // 未覆盖的是聚合阶段弃用的过短句桶——邻接场景即最近语境，胜过整集回落）
    if (scenes.length > 0) {
      const ref = isFinite(t) ? t : scenes[0].startTime;
      let nearest = scenes[0];
      let nearestDist = Infinity;
      for (const scene of scenes) {
        const dist = Math.max(scene.startTime - ref, ref - scene.endTime, 0);
        if (dist < nearestDist) {
          nearest = scene;
          nearestDist = dist;
        }
      }
      return NextResponse.json({
        success: true,
        data: { sceneid: nearest.sceneid, nearest: true },
      });
    }

    return NextResponse.json(
      { success: false, code: "NOT_FOUND", message: "该集暂无微剧场语料" },
      { status: 404 },
    );
  } catch (error) {
    console.error("[GET /api/scenes/by-clip]", error);
    return NextResponse.json(
      { success: false, error: "Failed to resolve scene" },
      { status: 500 },
    );
  }
}
