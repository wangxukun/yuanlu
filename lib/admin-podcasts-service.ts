import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { generateSignatureUrl } from "@/lib/oss";
import { notFound } from "next/navigation";

/**
 * 获取管理员的播客列表
 * @param whereCondition
 */
export async function getAdminPodcasts(
  whereCondition: Prisma.podcastWhereInput = {},
) {
  // 1. 定义查询条件对象，并使用 satisfies 确保符合 Prisma 类型
  // 这样既能获得自动补全，又能作为类型推断的依据
  const summaryQuery = {
    where: whereCondition,
    include: {
      tags: true, // 关联标签
      _count: {
        select: { episode: true }, // 统计剧集数量
      },
    },
    orderBy: {
      totalPlays: Prisma.SortOrder.desc, // 按照播放量排序，或者按照创建时间（如果你的表有 createAt 的话）
    },
  } satisfies Prisma.podcastFindManyArgs;

  type summaryPodcastRaw = Prisma.podcastGetPayload<typeof summaryQuery>;

  try {
    // 获取真实数据
    const podcasts = await prisma.podcast.findMany(summaryQuery);

    const processedPodcasts = await Promise.all(
      podcasts.map(async (p: summaryPodcastRaw) => {
        let signedCoverUrl = p.coverFileName;
        // 获取每个播客的封面图片的签名 URL
        if (p.coverFileName) {
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
        };
      }),
    );

    return processedPodcasts;
  } catch (error) {
    console.error("Failed to fetch podcasts:", error);
    return [];
  }
}

export async function getAdminPodcast(id: string) {
  const query = {
    where: { podcastid: id },
    include: {
      tags: true,
    },
  } satisfies Prisma.podcastFindUniqueArgs;

  type PodcastRaw = Prisma.podcastGetPayload<typeof query>;

  // 1. 获取数据
  const podcast = (await prisma.podcast.findUnique(query)) as PodcastRaw;

  if (!podcast) {
    notFound();
  }

  const signedCoverUrl = await generateSignatureUrl(
    podcast.coverFileName || "",
    3600 * 3,
  );

  // 2. 转换数据格式以适配表单
  const initialData = {
    ...podcast,
    tags: podcast.tags.map((t) => t.name), // 提取标签名数组
    coverUrl: signedCoverUrl,
  };
  return initialData;
}
