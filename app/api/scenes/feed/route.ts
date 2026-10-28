import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  hasSensitiveTerm,
  pickGoldenClip,
  sanitizeSceneTitle,
} from "@/core/corpus/clip-core";
import { signOssHttpUrl } from "@/lib/oss";

/**
 * [RESHAPE T1.4] GET /api/scenes/feed — 探索画廊分页卡片流（声音明信片）。
 *
 * Query: page=1&pageSize=10&tag=&q=（tag=语用场景胶囊；q=标题/中文摘要模糊）
 * 200 { success, data: { items[], page, pageSize, total, tags[] } }
 * item = { sceneid, title, summaryZh, situationTag, cefrLevel, coverUrl,
 *          duration, clipCount, golden: {en, zh, start, end} | null }
 * tags = [{name, count}] 全量 situationTag 聚合（胶囊数据驱动，不受筛选影响）
 * 标题/金句经内容级净化（字幕原文可能携带红线词，读取侧兜底）。
 * 无需登录（画廊为转化入口；播放走 /api/clips/{id}/audio 的专享门禁）。
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(
      30,
      Math.max(1, Number(sp.get("pageSize")) || 10),
    );
    const tag = (sp.get("tag") || "").trim().slice(0, 50) || null;
    const q = (sp.get("q") || "").trim().slice(0, 60) || null;

    const where = {
      ...(tag ? { situationTag: tag } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { summaryZh: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [rows, total, tagRows] = await Promise.all([
      prisma.micro_scenes.findMany({
        where,
        select: {
          sceneid: true,
          title: true,
          summaryZh: true,
          situationTag: true,
          cefrLevel: true,
          coverUrl: true,
          duration: true,
          startTime: true,
          endTime: true,
          clipsJson: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.micro_scenes.count({ where }),
      // 胶囊词表：全量按 situationTag 聚合（不受 tag/q 筛选影响，胶囊恒稳）
      prisma.micro_scenes.groupBy({
        by: ["situationTag"],
        where: { situationTag: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { situationTag: "desc" } },
        take: 10,
      }),
    ]);

    const items = await Promise.all(
      rows.map(async (row) => {
        const clips =
          (
            row.clipsJson as {
              clips?: Array<{
                textEn?: string;
                textCn?: string | null;
                start?: number;
                end?: number;
              }>;
            } | null
          )?.clips || [];
        // 金句：首句带红线词时跳到首个干净句；全部命中回退首句并对译文再净
        const goldenClip = pickGoldenClip(clips);
        return {
          sceneid: row.sceneid,
          title: sanitizeSceneTitle(row.title, row.startTime),
          summaryZh: row.summaryZh,
          situationTag: row.situationTag,
          cefrLevel: row.cefrLevel,
          // 私有桶直链 403：封面现签（TTL 3h）
          coverUrl: await signOssHttpUrl(row.coverUrl),
          duration: row.duration,
          clipCount: clips.length,
          golden: goldenClip
            ? {
                en: goldenClip.textEn || "",
                zh: hasSensitiveTerm(goldenClip.textCn)
                  ? null
                  : goldenClip.textCn || null,
                start: goldenClip.start ?? row.startTime,
                end: goldenClip.end ?? row.endTime,
              }
            : null,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        items,
        page,
        pageSize,
        total,
        tags: tagRows
          .filter((t) => t.situationTag)
          .map((t) => ({
            name: t.situationTag as string,
            count: t._count._all,
          })),
      },
    });
  } catch (error) {
    console.error("[GET /api/scenes/feed]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch scenes feed" },
      { status: 500 },
    );
  }
}
