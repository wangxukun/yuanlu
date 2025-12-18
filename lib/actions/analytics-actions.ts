"use server";

import prisma from "@/lib/prisma";
// import { revalidatePath } from "next/cache";

/**
 * 增加播放量 (原子操作)
 * 同时更新单集播放量和所属播客的总播放量
 */
export async function incrementPlayCount(episodeId: string, podcastId: string) {
  if (!episodeId || !podcastId) return;

  try {
    await prisma.$transaction([
      // 1. 增加单集播放量
      prisma.episode.update({
        where: { episodeid: episodeId },
        data: { playCount: { increment: 1 } },
      }),
      // 2. 增加播客总播放量 (热度值)
      prisma.podcast.update({
        where: { podcastid: podcastId },
        data: { totalPlays: { increment: 1 } },
      }),
    ]);

    // 可选：如果不希望每次播放都刷新页面缓存（导致页面闪烁），可以不调用 revalidatePath
    // 统计数据通常允许有一定的延迟
  } catch (error) {
    console.error("Failed to increment play count:", error);
  }
}
