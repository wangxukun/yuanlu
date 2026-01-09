import { Metadata } from "next";
import prisma from "@/lib/prisma";
import { generateSignatureUrl } from "@/lib/oss";
import SeriesListClient, { Series } from "./SeriesListClient";
import { Prisma } from "@prisma/client";

// 辅助函数：将数据库难度映射为 UI 显示的等级
function mapDifficultyToLevel(
  difficulty: string | null,
): "Beginner" | "Intermediate" | "Advanced" {
  if (!difficulty) return "Intermediate";
  const d = difficulty.toUpperCase();
  if (["A1", "A2"].includes(d)) return "Beginner";
  if (["B1", "B2", "GENERAL"].includes(d)) return "Intermediate";
  if (["C1", "C2"].includes(d)) return "Advanced";
  return "Intermediate";
}

// 辅助函数：计算一组剧集的平均难度
function calculateSeriesLevel(
  episodes: { difficulty: string | null }[],
): "Beginner" | "Intermediate" | "Advanced" {
  if (episodes.length === 0) return "Beginner";

  // 简单的投票机制，取第一个非空的难度，或者扩展为众数逻辑
  // 这里为了性能，我们取前几个剧集中出现频率最高的映射等级
  const levels = episodes.map((e) => mapDifficultyToLevel(e.difficulty));

  const counts = { Beginner: 0, Intermediate: 0, Advanced: 0 };
  levels.forEach((l) => counts[l]++);

  if (
    counts.Advanced >= counts.Intermediate &&
    counts.Advanced >= counts.Beginner
  )
    return "Advanced";
  if (counts.Intermediate >= counts.Beginner) return "Intermediate";
  return "Beginner";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const decodedCategory = decodeURIComponent(category);

  return {
    title: `${decodedCategory} 系列推荐 | 远路`,
    description: `浏览 ${decodedCategory} 主题下的精选英语播客，提升你的听力水平。`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const decodedCategory = decodeURIComponent(category);

  // 1. 数据库查询
  const podcasts = await prisma.podcast.findMany({
    where: {
      tags: {
        some: {
          name: decodedCategory,
        },
      },
    },
    include: {
      tags: {
        select: { id: true, name: true },
      },
      _count: {
        select: { episode: true },
      },
      // 获取部分剧集用于计算难度
      episode: {
        take: 5,
        select: { difficulty: true },
        orderBy: {
          publishAt: Prisma.SortOrder.desc,
        },
      },
    },
  });

  // 如果没有找到任何播客，且该标签也不存在于系统中，可以考虑返回 404
  // 但为了体验，即便是空列表也渲染页面

  // 2. 数据处理与签名
  const seriesList: Series[] = await Promise.all(
    podcasts.map(async (podcast) => {
      let coverUrl = podcast.coverUrl;

      // 如果有文件名，生成签名 URL
      if (podcast.coverFileName) {
        try {
          coverUrl = await generateSignatureUrl(podcast.coverFileName, 3600);
        } catch (e) {
          console.error(
            `Failed to sign cover for podcast ${podcast.podcastid}`,
            e,
          );
        }
      }

      // 计算难度等级
      const level = calculateSeriesLevel(podcast.episode);

      return {
        id: podcast.podcastid,
        title: podcast.title,
        thumbnailUrl: coverUrl,
        description: podcast.description,
        level: level,
        category: decodedCategory,
        tags: podcast.tags.map((t) => ({ id: t.id, name: t.name })),
        episodeCount: podcast._count.episode,
        plays: podcast.totalPlays,
      };
    }),
  );

  return <SeriesListClient tagName={decodedCategory} allSeries={seriesList} />;
}
