import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authWithMobile, canAccessEpisode } from "@/core/auth/guard";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  console.log("[GET /api/episode/detail]", id);

  // 验证参数有效性
  if (!id) {
    console.error("Invalid episode ID", id);
    return NextResponse.json({ error: "Invalid episode ID", status: 400 });
  }
  try {
    // Cookie 优先、移动端 Bearer Token 兜底；未登录返回 null（匿名可看元信息）
    const session = await authWithMobile();
    const userid = session?.user?.userid ?? null;

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

    // 用户收听态（登录时）：断点续播进度 + 收藏态，驱动客户端续播与进度条
    let userState = null;
    if (userid && episode) {
      const [history, favorite] = await Promise.all([
        prisma.listening_history.findUnique({
          where: { userid_episodeid: { userid, episodeid: id } },
          select: {
            progressSeconds: true,
            isFinished: true,
            listenAt: true,
          },
        }),
        prisma.episode_favorites.findUnique({
          where: { userid_episodeid: { userid, episodeid: id } },
        }),
      ]);
      if (history || favorite) {
        userState = {
          progressSeconds: history?.progressSeconds ?? 0,
          isFinished: history?.isFinished ?? false,
          lastListenAt: history?.listenAt ?? null,
          isFavorited: !!favorite,
        };
      }
    }

    return NextResponse.json({ ...episode, userState });
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
