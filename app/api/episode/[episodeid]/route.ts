import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  authWithMobile,
  canAccessEpisode,
  stripExclusiveEpisodeMedia,
} from "@/core/auth/guard";

export async function GET(
  request: Request,
  props: { params: Promise<{ episodeid: string }> },
) {
  try {
    const params = await props.params;
    const episodeId = params.episodeid;

    // 1. 获取当前登录用户 (如果未登录，user 为 null)
    // 这一点对“精听工具”很重要：未登录用户只能看基本信息，登录用户能看到进度
    // [P1-3/P1-4] Cookie 优先、移动端 Bearer 兜底（Android 契约接口）
    const session = await authWithMobile();
    const userId = session?.user?.userid;

    // 2. 使用 Prisma 进行一次性查询
    // 这里使用了 Prisma 强大的 include 和 where 组合技巧
    const episode = await prisma.episode.findUnique({
      where: {
        episodeid: episodeId,
      },
      include: {
        // 关联获取所属播客的信息
        podcast: {
          select: {
            podcastid: true,
            title: true,
            coverUrl: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
          },
        },
        // 关键点：获取当前用户的交互数据
        // 注意：这里我们尝试获取关联数组，稍后在代码里处理成单条数据
        listening_history: userId
          ? {
              where: {
                userid: userId,
              },
              take: 1, // 只需要最新的一条
            }
          : false, // 如果没登录，就不查这个表
        episode_favorites: userId
          ? {
              where: {
                userid: userId,
              },
            }
          : false,
      },
    });

    if (!episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    // 3. 数据整形 (Data Transformation)
    // 直接把数据库原始数据给前端通常比较乱，我们整理成前端好用的格式
    const userSpecificData = userId
      ? {
          // 如果有历史记录，返回进度（秒）；否则为 0
          progressSeconds: episode.listening_history[0]?.progressSeconds || 0,
          isFinished: episode.listening_history[0]?.isFinished || false,
          lastListenAt: episode.listening_history[0]?.listenAt || null,
          // 检查收藏数组长度是否大于 0
          isFavorited: episode.episode_favorites.length > 0,
        }
      : null;

    // 4. 清理返回对象（移除冗余的数组结构，换上我们整理好的数据）
    const { listening_history, episode_favorites, ...baseEpisodeData } =
      episode;
    console.log("clear date: ", listening_history, episode_favorites);

    // [P1-4] 本接口此前返回全部原始列（含 DB 直链 audioUrl），且无专享剥离——
    // 统一走 canAccessEpisode + 共享剥离助手，与 detail 接口同口径
    if (
      baseEpisodeData.isExclusive &&
      !(await canAccessEpisode(session?.user, baseEpisodeData))
    ) {
      stripExclusiveEpisodeMedia(baseEpisodeData);
    }

    return NextResponse.json({
      ...baseEpisodeData,
      userState: userSpecificData, // 将用户状态单独封装，逻辑清晰
    });
  } catch (error) {
    console.error("Error fetching episode:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
