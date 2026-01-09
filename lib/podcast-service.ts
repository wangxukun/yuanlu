// lib/podcast-service.ts
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";
import { generateSignatureUrl } from "@/lib/oss"; // 引入签名方法
import { cache } from "react";

// 由于 getPodcastDetail 是直接调用数据库（Prisma），为了避免在一个请求中重复查询数据库（一次在 Metadata，一次在 Page），
// 建议使用 React 的 cache 进行包裹。
export const getPodcastDetail = cache(async (id: string) => {
  if (!id) return null;

  // 1. 获取当前用户 Session (Server Component 中可用)
  const session = await auth();
  const userId = session?.user?.userid;

  // 2. 查询数据库
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
      totalPlays: true,
      followerCount: true,
      isEditorPick: true,
      createAt: true,
      tags: {
        select: {
          id: true,
          name: true,
        },
      },
      // 检查播客收藏状态
      podcast_favorites: userId
        ? {
            where: { userid: userId },
            select: { favoriteid: true },
          }
        : false,
      episode: {
        orderBy: {
          publishAt: Prisma.SortOrder.desc,
        },
        select: {
          episodeid: true,
          title: true,
          description: true,
          coverUrl: true,
          coverFileName: true,
          duration: true,
          playCount: true,
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
          // 检查单集收藏状态
          episode_favorites: userId
            ? {
                where: { userid: userId },
                select: { favoriteid: true },
              }
            : false,
          // 获取收听历史
          listening_history: userId
            ? {
                where: { userid: userId },
                select: {
                  progressSeconds: true,
                  isFinished: true,
                },
              }
            : false,
        },
      },
    },
  });

  if (!podcastRaw) {
    return null;
  }

  // 3. 处理 OSS 签名 (逻辑参考 lib/data.ts)
  // 为播客封面生成签名
  if (podcastRaw.coverFileName) {
    try {
      podcastRaw.coverUrl = await generateSignatureUrl(
        podcastRaw.coverFileName,
        3600 * 3,
      );
    } catch (error) {
      console.error("Failed to sign podcast cover url", error);
    }
  }

  // 并行处理所有 episodes 的签名和数据扁平化
  const processedEpisodes = await Promise.all(
    podcastRaw.episode.map(async (ep) => {
      // --- 签名逻辑 ---

      // 封面
      if (ep.coverFileName) {
        try {
          ep.coverUrl = await generateSignatureUrl(ep.coverFileName, 3600 * 3);
        } catch (e) {
          console.error(e);
        }
      }

      // 音频
      if (ep.audioFileName) {
        try {
          ep.audioUrl = await generateSignatureUrl(ep.audioFileName, 3600 * 3);
        } catch (e) {
          console.error(e);
        }
      }

      // 英文字幕
      if (ep.subtitleEnFileName) {
        try {
          ep.subtitleEnUrl = await generateSignatureUrl(
            ep.subtitleEnFileName,
            3600 * 3,
          );
        } catch (e) {
          console.error(e);
        }
      }

      // 中文字幕
      if (ep.subtitleZhFileName) {
        try {
          ep.subtitleZhUrl = await generateSignatureUrl(
            ep.subtitleZhFileName,
            3600 * 3,
          );
        } catch (e) {
          console.error(e);
        }
      }

      // --- 数据扁平化逻辑 ---
      const history = ep.listening_history && ep.listening_history[0];

      return {
        ...ep,
        // 转换收藏状态
        isFavorited: ep.episode_favorites
          ? ep.episode_favorites.length > 0
          : false,
        episode_favorites: undefined,

        // 转换历史进度
        progressSeconds: history ? history.progressSeconds : 0,
        isFinished: history ? history.isFinished : false,
        listening_history: undefined,
      };
    }),
  );

  // 4. 返回最终结果
  return {
    ...podcastRaw,
    isFavorited: podcastRaw.podcast_favorites
      ? podcastRaw.podcast_favorites.length > 0
      : false,
    podcastFavorites: undefined,
    episode: processedEpisodes,
  };
});

/**
 * [新增] 获取用于生成 Sitemap 的播客列表数据
 * 直接查询数据库，避免构建时 fetch 失败
 */
export async function getPodcastsForSitemap() {
  const podcasts = await prisma.podcast.findMany({
    where: {
      // 确保只收录公开或有效的播客
      coverFileName: { not: null },
    },
    select: {
      podcastid: true,
      createAt: true,
    },
    orderBy: {
      createAt: Prisma.SortOrder.desc,
    },
  });
  return podcasts;
}
