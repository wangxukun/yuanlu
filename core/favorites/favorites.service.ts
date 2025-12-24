// core/favorites/favorites.service.ts
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateSignatureUrl } from "@/lib/oss";
import { FavoriteSeries, FavoriteEpisode } from "./dto";

// 简单的辅助函数：秒 -> MM:SS
const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const favoritesService = {
  /**
   * 获取用户收藏的播客系列 (支持封面签名)
   */
  async getFavoriteSeries(userId: string): Promise<FavoriteSeries[]> {
    // 1. 定义查询条件
    const seriesQuery = {
      where: { userid: userId },
      include: {
        podcast: {
          include: {
            _count: {
              select: { episode: true },
            },
            tags: true,
          },
        },
      },
      orderBy: { favoriteDate: Prisma.SortOrder.desc },
    } satisfies Prisma.podcast_favoritesFindManyArgs;

    // 定义原始返回类型
    type SeriesRaw = Prisma.podcast_favoritesGetPayload<typeof seriesQuery>;

    try {
      const favorites = await prisma.podcast_favorites.findMany(seriesQuery);

      // 2. 并行处理，获取签名 URL
      const processedSeries = await Promise.all(
        favorites.map(async (f: SeriesRaw): Promise<FavoriteSeries | null> => {
          const p = f.podcast;
          if (!p) return null; // 播客可能已被删除

          // 处理封面签名
          let signedCoverUrl = p.coverUrl || "/static/images/podcast-light.png";
          if (p.coverFileName) {
            try {
              signedCoverUrl = await generateSignatureUrl(
                p.coverFileName,
                3600 * 3, // 3小时有效期
              );
            } catch (e) {
              console.error(`Failed to sign url for podcast ${p.title}`, e);
              // 失败则回退到原始 URL
              if (p.coverUrl) signedCoverUrl = p.coverUrl;
            }
          }

          // 尝试从 tags 获取分类，如果没有则默认
          const categoryTag = p.tags;

          return {
            id: p.podcastid,
            title: p.title,
            author: p.platform || p.title, // 播客通常只有标题，暂时复用
            thumbnailUrl: signedCoverUrl,
            category: categoryTag,
            episodeCount: p._count.episode,
            plays: p.totalPlays,
            followers: p.followerCount, // 这里可以根据标签或其他逻辑动态生成
          };
        }),
      );

      return processedSeries.filter(
        (item): item is FavoriteSeries => item !== null,
      );
    } catch (error) {
      console.error("Failed to fetch favorite series:", error);
      return [];
    }
  },

  /**
   * 获取用户收藏的单集 (支持封面签名)
   */
  async getFavoriteEpisodes(userId: string): Promise<FavoriteEpisode[]> {
    // 1. 定义查询条件
    const episodesQuery = {
      where: { userid: userId },
      include: {
        episode: {
          include: {
            podcast: true,
          },
        },
      },
      orderBy: { favoriteDate: Prisma.SortOrder.desc },
    } satisfies Prisma.episode_favoritesFindManyArgs;

    // 定义原始返回类型
    type EpisodesRaw = Prisma.episode_favoritesGetPayload<typeof episodesQuery>;

    try {
      const favorites = await prisma.episode_favorites.findMany(episodesQuery);

      // 2. 并行处理，获取签名 URL
      const processedEpisodes = await Promise.all(
        favorites.map(
          async (f: EpisodesRaw): Promise<FavoriteEpisode | null> => {
            const e = f.episode;
            if (!e) return null; // 单集可能已被删除

            // 处理封面签名逻辑
            // 优先级: 单集封面 -> 播客封面 -> 默认图
            let finalCoverUrl = "/static/images/episode-light.png";

            // 1. 尝试使用单集封面
            if (e.coverFileName) {
              try {
                finalCoverUrl = await generateSignatureUrl(
                  e.coverFileName,
                  3600 * 3,
                );
              } catch (err) {
                console.error(`Failed to sign episode cover ${e.title}`, err);
                if (e.coverUrl) finalCoverUrl = e.coverUrl;
              }
            } else if (e.coverUrl) {
              finalCoverUrl = e.coverUrl;
            }
            // 2. 如果单集没封面，尝试使用播客封面
            else if (e.podcast?.coverFileName) {
              try {
                finalCoverUrl = await generateSignatureUrl(
                  e.podcast.coverFileName,
                  3600 * 3,
                );
              } catch (err) {
                console.error(
                  `Failed to sign podcast cover for episode ${e.title}`,
                  err,
                );
                if (e.podcast.coverUrl) finalCoverUrl = e.podcast.coverUrl;
              }
            } else if (e.podcast?.coverUrl) {
              finalCoverUrl = e.podcast.coverUrl;
            }

            return {
              id: e.episodeid,
              title: e.title,
              author: e.podcast?.title || "Unknown Series",
              thumbnailUrl: finalCoverUrl,
              category: e.podcast?.title || "Episode", // 使用播客名作为分类
              date: e.publishAt
                ? new Date(e.publishAt).toLocaleDateString("zh-CN")
                : "Unknown",
              duration: formatDuration(e.duration),
              playCount: e.playCount,
              podcastId: e.podcastid || "",
            };
          },
        ),
      );

      return processedEpisodes.filter(
        (item): item is FavoriteEpisode => item !== null,
      );
    } catch (error) {
      console.error("Failed to fetch favorite episodes:", error);
      return [];
    }
  },

  /**
   * 移除播客收藏
   */
  async removePodcastFavorite(userId: string, podcastId: string) {
    return await prisma.podcast_favorites.deleteMany({
      where: {
        userid: userId,
        podcastid: podcastId,
      },
    });
  },

  /**
   * 移除单集收藏
   */
  async removeEpisodeFavorite(userId: string, episodeId: string) {
    return await prisma.episode_favorites.deleteMany({
      where: {
        userid: userId,
        episodeid: episodeId,
      },
    });
  },
};
