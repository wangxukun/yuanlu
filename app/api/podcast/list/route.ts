import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateSignatureUrl } from "@/lib/oss";

export async function GET() {
  try {
    // 获取所有分类数据（添加take限制防止全表扫描）
    const podcasts = await prisma.podcast.findMany({
      where: {
        coverFileName: {
          not: null,
        },
      },
      select: {
        // 明确选择需要字段
        podcastid: true,
        title: true,
        coverUrl: true,
        coverFileName: true,
        description: true,
        platform: true,
        isEditorPick: true,
        tags: {
          select: {
            tagid: true,
            podcastid: true,
            tag: {
              select: {
                tagid: true,
                name: true,
              },
            },
          },
        },
      },
    });
    // 并行处理签名URL
    const signedPodcasts = await Promise.all(
      podcasts.map(async (podcast) => ({
        ...podcast,
        coverUrl: podcast.coverFileName
          ? await generateSignatureUrl(podcast.coverFileName, 3600 * 3)
          : null,
      })),
    );

    return NextResponse.json(signedPodcasts);
  } catch (error) {
    // 确保异常时也释放连接
    await prisma.$disconnect();
    console.error("[GET /api/podcast/list]", error);
    return NextResponse.json({ error: "Internal Server Error", status: 500 });
  } finally {
    // 最佳实践：在finally块中执行清理操作
    await prisma.$disconnect();
  }
}
