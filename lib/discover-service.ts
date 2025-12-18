import prisma from "@/lib/prisma";
import { generateSignatureUrl } from "@/lib/oss";
import { Prisma } from "@prisma/client";

// 1. 定义查询条件对象，并使用 satisfies 确保符合 Prisma 类型
// 这样既能获得自动补全，又能作为类型推断的依据
const trendingQuery = {
  take: 3,
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
