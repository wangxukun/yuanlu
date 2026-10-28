import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * [RESHAPE T1.4] GET /api/scenes/feed — 探索画廊分页卡片流（声音明信片）。
 *
 * Query: page=1&pageSize=10&tag=&q=（tag=语用场景胶囊；q=标题/中文摘要模糊）
 * 200 { success, data: { items[], page, pageSize, total } }
 * item = { sceneid, title, summaryZh, situationTag, cefrLevel, coverUrl,
 *          duration, clipCount, golden: {en, zh, start, end} | null }
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

    const [rows, total] = await Promise.all([
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
    ]);

    const items = rows.map((row) => {
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
      const goldenClip = clips[0] || null;
      return {
        sceneid: row.sceneid,
        title: row.title,
        summaryZh: row.summaryZh,
        situationTag: row.situationTag,
        cefrLevel: row.cefrLevel,
        coverUrl: row.coverUrl,
        duration: row.duration,
        clipCount: clips.length,
        golden: goldenClip
          ? {
              en: goldenClip.textEn || "",
              zh: goldenClip.textCn || null,
              start: goldenClip.start ?? row.startTime,
              end: goldenClip.end ?? row.endTime,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: { items, page, pageSize, total },
    });
  } catch (error) {
    console.error("[GET /api/scenes/feed]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch scenes feed" },
      { status: 500 },
    );
  }
}
