import prisma from "@/lib/prisma";
import { generateSignatureUrl } from "@/lib/oss";
import { Prisma } from "@prisma/client";

// 1. 定义查询条件对象，并使用 satisfies 确保符合 Prisma 类型
// 这样既能获得自动补全，又能作为类型推断的依据
const trendingQuery = {
  take: 5,
  orderBy: {
    totalPlays: Prisma.SortOrder.desc, // 按总播放量降序
  },
  include: {
    tags: {
      take: 1,
      select: { name: true },
    },
    episode: {
      take: 1,
      orderBy: {
        publishAt: Prisma.SortOrder.desc,
      },
      select: { episodeid: true },
    },
    _count: {
      select: { episode: true },
    },
  },
} satisfies Prisma.podcastFindManyArgs;

// 2. 从查询对象中提取出准确的返回类型
// 这里的 T 会自动包含 tags, episode, _count
type TrendingPodcastRaw = Prisma.podcastGetPayload<typeof trendingQuery>;

export async function getTrendingPodcasts() {
  try {
    // 3. 使用定义好的查询对象
    const podcasts = await prisma.podcast.findMany(trendingQuery);
    // 4. 处理图片签名
    const processedPodcasts = await Promise.all(
      // 显式告知 map 函数，p 的类型是 TrendingPodcastRaw
      podcasts.map(async (p: TrendingPodcastRaw) => {
        let signedCoverUrl = p.coverUrl;
        if (
          p.coverFileName &&
          (p.coverUrl || p.coverUrl === "default_cover_url")
        ) {
          try {
            signedCoverUrl = await generateSignatureUrl(
              p.coverFileName,
              3600 * 3,
            );
          } catch (e) {
            console.error(`Failed to sign url for podcast ${p.title}`, e);
          }
        }
        return {
          ...p,
          coverUrl: signedCoverUrl,
          category: p.tags[0]?.name || "General",
          latestEpisodeId: p.episode[0]?.episodeid || null,
          episodeCount: p._count.episode,
        };
      }),
    );

    return processedPodcasts;
  } catch (error) {
    console.error("Failed to fetch trending podcasts:", error);
    return [];
  }
}

// 定义返回的数据类型，供组件使用
export type TrendingPodcastItem = Awaited<
  ReturnType<typeof getTrendingPodcasts>
>[number];

/**
 * 获取最新发布的播客数据 (用于 Featured Banner)
 * @param limit 获取数量
 */
export async function getLatestPodcasts(limit: number = 1) {
  try {
    const podcasts = await prisma.podcast.findMany({
      orderBy: {
        createAt: Prisma.SortOrder.desc, // [修改] 使用 createAt 倒序
      },
      take: limit,
      include: {
        tags: true,
        _count: {
          select: { episode: true },
        },
        // 获取第一集的信息用于"开始第一集"按钮
        episode: {
          take: 1,
          orderBy: {
            episodeid: Prisma.SortOrder.asc, // 或者 publishAt: 'asc'，假设第一集是最早发布的
          },
          select: {
            episodeid: true,
          },
        },
      },
    });

    if (!podcasts || podcasts.length === 0) {
      return [];
    }

    // 处理 OSS 签名
    const processedPodcasts = await Promise.all(
      podcasts.map(async (podcast) => {
        let signedCoverUrl = podcast.coverUrl;

        if (podcast.coverFileName && podcast.coverUrl !== "default_cover_url") {
          try {
            signedCoverUrl = await generateSignatureUrl(
              podcast.coverFileName,
              3600 * 3,
            );
          } catch (error) {
            console.error(
              `Failed to sign cover for podcast ${podcast.podcastid}`,
              error,
            );
          }
        }

        return {
          ...podcast,
          coverUrl: signedCoverUrl,
          episodeCount: podcast._count.episode,
          firstEpisodeId: podcast.episode[0]?.episodeid,
        };
      }),
    );

    return processedPodcasts;
  } catch (error) {
    console.error("Failed to fetch latest podcasts:", error);
    return [];
  }
}

/**
 * 获取热门标签（按照关联的 Podcast 数量排序）
 * @param limit 限制数量，默认为 6
 */
export async function getPopularTags(limit: number = 6) {
  try {
    const tags = await prisma.tag.findMany({
      take: limit,
      include: {
        _count: {
          select: { podcasts: true },
        },
      },
      orderBy: {
        podcasts: {
          _count: Prisma.SortOrder.desc,
        },
      },
    });

    // 格式化返回数据，保留原有 UI 需要的结构
    return tags.map((tag) => ({
      id: tag.id.toString(),
      name: tag.name,
      count: tag._count.podcasts,
    }));
  } catch (error) {
    console.error("Failed to fetch popular tags:", error);
    return [];
  }
}

/**
 * 根据关键词搜索播客 (搜索范围: 标题、描述、标签)
 */
export async function getPodcastsByQuery(query: string) {
  if (!query || query.trim().length === 0) return [];

  try {
    const podcasts = await prisma.podcast.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          {
            tags: { some: { name: { contains: query, mode: "insensitive" } } },
          },
        ],
      },
      include: {
        tags: true,
        _count: {
          select: { episode: true },
        },
      },
      take: 20, // 限制返回数量
    });

    // 处理图片签名 (复用逻辑)
    const processedPodcasts = await Promise.all(
      podcasts.map(async (podcast) => {
        let signedCoverUrl = podcast.coverUrl;
        if (podcast.coverFileName && podcast.coverUrl !== "default_cover_url") {
          try {
            signedCoverUrl = await generateSignatureUrl(
              podcast.coverFileName,
              3600 * 3,
            );
          } catch (error) {
            console.error(
              `Failed to sign cover for podcast ${podcast.podcastid}`,
              error,
            );
          }
        }
        return {
          ...podcast,
          coverUrl: signedCoverUrl,
          episodeCount: podcast._count.episode,
        };
      }),
    );

    return processedPodcasts;
  } catch (error) {
    console.error("Failed to search podcasts:", error);
    return [];
  }
}
