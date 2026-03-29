/**
 * Repository层，只做数据库查询
 * 不做业务逻辑
 * 不做映射
 * 不做计算
 * 不做过滤
 * 不做分页逻辑
 * 不做权限逻辑
 *
 * 如果 API 直接用 Repository，那么：
 *
 * 未来你所有 API 都要重复写同样的逻辑
 * = 重复代码 → 维护困难 → 极易出 Bug
 */
import prisma from "@/lib/prisma";
import { Episode } from "@/core/episode/episode.entity";
import { Prisma } from "@prisma/client";

export const episodeRepository = {
  // [修改] 增加 where 参数，允许传递筛选条件
  async findAll(where?: Prisma.episodeWhereInput): Promise<Episode[]> {
    const episodes = await prisma.episode.findMany({
      where, // 应用筛选条件
      orderBy: {
        publishAt: Prisma.SortOrder.desc, // 默认按发布时间倒序，体验更好
      },
      select: {
        episodeid: true,
        coverUrl: true,
        coverFileName: true,
        title: true,
        audioUrl: true,
        audioFileName: true,
        duration: true,
        subtitleEnUrl: true,
        subtitleEnFileName: true,
        subtitleZhUrl: true,
        subtitleZhFileName: true,
        podcastid: true,
        publishAt: true,
        createAt: true,
        status: true,
        isExclusive: true,
        isCommentEnabled: true,
        difficulty: true,
        playCount: true,
        podcast: {
          select: {
            podcastid: true,
            title: true,
          },
        },
        tags: {
          take: 1, // 只取一个作为分类标签
          select: {
            name: true,
          },
        },
      },
    });
    return episodes as unknown as Episode[];
  },

  async findById(id: string): Promise<Episode> {
    return (await prisma.episode.findUnique({
      where: { episodeid: id },
      select: {
        episodeid: true,
        title: true,
        description: true,
        coverUrl: true,
        coverFileName: true,
        duration: true,
        audioUrl: true,
        audioFileName: true,
        subtitleEnUrl: true,
        subtitleEnFileName: true,
        subtitleZhUrl: true,
        subtitleZhFileName: true,
        podcastid: true,
        publishAt: true,
        createAt: true,
        status: true,
        isExclusive: true,
        isCommentEnabled: true,
        uploaderid: true,
        updateAt: true,
        difficulty: true,
        playCount: true,
        episode_favorites: {
          select: {
            userid: true,
            favoriteid: true,
            episodeid: true,
          },
        },
        podcast: {
          select: {
            podcastid: true,
            title: true,
            coverUrl: true,
            coverFileName: true,
            description: true,
            platform: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })) as unknown as Episode;
  },

  async create(
    data: Prisma.episodeUncheckedCreateInput | Prisma.episodeCreateInput,
  ) {
    return prisma.episode.create({
      data,
    });
  },

  async update(id: string, data: Prisma.episodeUpdateInput) {
    return prisma.episode.update({
      where: { episodeid: id },
      select: {
        title: true,
        description: true,
        podcastid: true,
        episodeid: true,
      },
      data,
    });
  },

  async updateSubtitleEn(id: string, data: Prisma.episodeUpdateInput) {
    const { subtitleEnUrl, subtitleEnFileName } = data;
    return prisma.episode.update({
      where: { episodeid: id },
      select: { subtitleEnUrl: true, subtitleEnFileName: true },
      data: { subtitleEnUrl, subtitleEnFileName },
    });
  },

  async updateSubtitleZh(id: string, data: Prisma.episodeUpdateInput) {
    const { subtitleZhUrl, subtitleZhFileName } = data;
    return prisma.episode.update({
      where: { episodeid: id },
      select: { subtitleZhUrl: true, subtitleZhFileName: true },
      data: { subtitleZhUrl, subtitleZhFileName },
    });
  },

  async delete(id: string) {
    return prisma.episode.delete({ where: { episodeid: id } });
  },
};
