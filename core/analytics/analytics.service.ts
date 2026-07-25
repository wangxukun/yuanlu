import prisma from "@/lib/prisma";

export const analyticsService = {
  /**
   * 增加播放量 (原子操作)
   * 同时更新单集播放量和所属播客的总播放量
   */
  async incrementPlayCount(episodeId: string, podcastId: string) {
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
    } catch (error) {
      console.error("Failed to increment play count:", error);
      throw error;
    }
  },
};
