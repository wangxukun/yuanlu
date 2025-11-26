import prisma from "@/lib/prisma";
import { Episode } from "@/core/episode/episode.entity";

export const episodeRepository = {
  async findAll(): Promise<Episode[]> {
    const episodes = await prisma.episode.findMany({
      select: {
        // 明确选择需要字段
        episodeid: true,
        coverUrl: true,
        coverFileName: true,
        title: true,
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
        isCommentEnabled: true,
        podcast: {
          select: {
            // 明确选择需要字段
            podcastid: true,
            title: true,
          },
        },
      },
    });
    return episodes as unknown as Episode[];
  },

  async findById(id: string): Promise<Episode | null> {
    const episode = await prisma.episode.findUnique({
      where: { episodeid: id },
    });
    return episode as Episode | null;
  },

  // async create(data: Omit<Episode, "episodeid" | "createdAt" | "updatedAt">) {
  //     const result =  await prisma.episode.create({ data: data as any });
  //     return result;
  // },
  //
  // async update(id: string, data: Partial<Episode>) {
  //     return prisma.episode.update({ where: { episodeid: id }, data: data as any });
  // },

  async delete(id: string) {
    return prisma.episode.delete({ where: { episodeid: id } });
  },
};
