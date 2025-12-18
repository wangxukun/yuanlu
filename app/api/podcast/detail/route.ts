import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client"; // 引入 auth 方法获取 session

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  console.log("[GET /api/podcast/detail]", id);

  // 验证参数有效性
  if (!id) {
    console.error("Invalid podcast ID", id);
    return NextResponse.json({ error: "Invalid podcast ID", status: 400 });
  }

  try {
    // 1. 获取当前用户 Session
    const session = await auth();
    const userId = session?.user?.id;

    // 2. 查询数据（注入收藏状态检查）
    const podcastRaw = await prisma.podcast.findFirst({
      where: {
        podcastid: id,
      },
      select: {
        podcastid: true,
        title: true,
        coverUrl: true,
        coverFileName: true,
        description: true,
        platform: true,
        totalPlays: true, // 确保返回热度数据
        followerCount: true, // 确保返回订阅数
        // 检查当前用户是否收藏了该播客
        podcast_favorites: userId
          ? {
              where: { userid: userId },
              select: { favoriteid: true },
            }
          : false,
        episode: {
          orderBy: {
            publishAt: Prisma.SortOrder.desc, // 建议加上排序
          },
          select: {
            episodeid: true,
            title: true,
            description: true,
            coverUrl: true,
            coverFileName: true,
            duration: true,
            playCount: true, // 确保返回单集播放量
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
            // 检查当前用户是否收藏了该单集
            episode_favorites: userId
              ? {
                  where: { userid: userId },
                  select: { favoriteid: true },
                }
              : false,
          },
        },
      },
    });

    if (!podcastRaw) {
      return NextResponse.json({ error: "Podcast not found", status: 404 });
    }

    // 3. 数据转换：将 database relation 转换为 boolean 状态
    const podcast = {
      ...podcastRaw,
      // 如果数组长度 > 0，则表示已收藏
      isFavorited: podcastRaw.podcast_favorites
        ? podcastRaw.podcast_favorites.length > 0
        : false,
      // 清理掉原始的 relation 数组，保持 API 响应整洁
      podcast_favorites: undefined,
      episode: podcastRaw.episode.map((ep) => ({
        ...ep,
        isFavorited: ep.episode_favorites
          ? ep.episode_favorites.length > 0
          : false,
        episode_favorites: undefined,
      })),
    };

    return NextResponse.json(podcast);
  } catch (error) {
    console.error("[GET /api/podcast/detail]", error);
    return NextResponse.json({ error: "Internal Server Error", status: 500 });
  }
  // 注意：Next.js 环境下 Prisma 通常不需要手动 disconnect，框架会管理连接池
}
