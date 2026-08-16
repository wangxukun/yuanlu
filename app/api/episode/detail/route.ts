import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { canAccessEpisode } from "@/core/auth/guard";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  console.log("[GET /api/episode/detail]", id);

  // 验证参数有效性
  if (!id) {
    console.error("Invalid episode ID", id);
    return NextResponse.json({ error: "Invalid episode ID", status: 400 });
  }
  try {
    const episode = await prisma.episode.findFirst({
      where: {
        episodeid: id,
      },
      select: {
        // 明确选择需要字段
        episodeid: true,
        title: true,
        description: true,
        coverUrl: true,
        coverFileName: true,
        duration: true,
        audioUrl: true,
        audioFileName: true,
        subtitleEnUrl: true,
        subtitleEnFileName: true,
        subtitleZhUrl: true,
        subtitleZhFileName: true,
        subtitleBilingualUrl: true,
        subtitleBilingualFileName: true,
        podcastid: true,
        publishAt: true,
        createAt: true,
        status: true,
        isExclusive: true,
        isCommentEnabled: true,
        playCount: true,
        difficulty: true,
        podcast: {
          select: {
            podcastid: true,
            title: true,
            coverUrl: true,
            coverFileName: true,
            description: true,
            platform: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 会员专享剧集：无权限用户剥离媒体与字幕地址，仅保留元信息
    // （统一入口 canAccessEpisode；非专享剧集短路返回，不产生 auth() 开销）
    if (episode?.isExclusive) {
      const session = await auth();
      if (!(await canAccessEpisode(session?.user, episode))) {
        episode.audioUrl = "";
        episode.audioFileName = "";
        episode.subtitleEnUrl = "";
        episode.subtitleEnFileName = "";
        episode.subtitleZhUrl = "";
        episode.subtitleZhFileName = "";
        episode.subtitleBilingualUrl = "";
        episode.subtitleBilingualFileName = "";
      }
    }

    return NextResponse.json(episode);
  } catch (error) {
    // 确保异常时也释放连接
    await prisma.$disconnect();
    console.error("[GET /api/episode/detail]", error);
    return NextResponse.json({ error: "Internal Server Error", status: 500 });
  } finally {
    // 最佳实践：在finally块中执行清理操作
    await prisma.$disconnect();
  }
}
