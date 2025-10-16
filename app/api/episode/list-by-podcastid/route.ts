import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const podcastId = req.nextUrl.searchParams.get("podcastId");
  console.log("[GET /api/episode/list-by-podcastid]", podcastId);
  try {
    // 获取所有分类数据（添加take限制防止全表扫描）
    const episodes = await prisma.episode.findMany({
      where: {
        podcastid: podcastId,
      },
      select: {
        // 明确选择需要字段
        episodeid: true,
        coverUrl: true,
        coverFileName: true,
        title: true,
        audioUrl: true,
        audioFileName: true,
        subtitleEnUrl: true,
        subtitleEnFileName: true,
        subtitleZhUrl: true,
        subtitleZhFileName: true,
        publishAt: true,
        createAt: true,
        status: true,
        isExclusive: true,
        isCommentEnabled: true,
        // podcast: {
        //   select: {
        //     // 明确选择需要字段
        //     podcastid: true,
        //     title: true,
        //   },
        // },
      },
    });
    return NextResponse.json(episodes);
  } catch (error) {
    // 确保异常时也释放连接
    await prisma.$disconnect();
    console.error("[GET /api/episode/list-by-podcastid]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    // 最佳实践：在finally块中执行清理操作
    await prisma.$disconnect();
  }
}
