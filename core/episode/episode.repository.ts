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

  async findById(id: string): Promise<Episode> {
    const episode = await prisma.episode.findUnique({
      where: {
        episodeid: id,
      },
      select: {
        // 明确选择需要字段
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
    });
    return episode as unknown as Episode;
  },

  /**
   * 创建剧集
   * @param data
   */
  async create(data: Prisma.episodeCreateInput) {
    return prisma.episode.create({
      // 忽略 episodeid
      omit: {
        episodeid: true,
      },
      data,
    });
  },

  /**
   * 更新剧集
   * @param id
   * @param data
   */
  async update(id: string, data: Prisma.episodeUpdateInput) {
    return prisma.episode.update({
      where: {
        episodeid: id,
      },
      select: {
        title: true,
        description: true,
      },
      data,
    });
  },

  // 更新英文字幕
  async updateSubtitleEn(id: string, data: Prisma.episodeUpdateInput) {
    const { subtitleEnUrl, subtitleEnFileName } = data;
    return prisma.episode.update({
      where: {
        episodeid: id,
      },
      select: {
        subtitleEnUrl: true,
        subtitleEnFileName: true,
      },
      data: {
        subtitleEnUrl,
        subtitleEnFileName,
      },
    });
  },

  // 更新中文字幕
  async updateSubtitleZh(id: string, data: Prisma.episodeUpdateInput) {
    const { subtitleZhUrl, subtitleZhFileName } = data;
    return prisma.episode.update({
      where: {
        episodeid: id,
      },
      select: {
        subtitleZhUrl: true,
        subtitleZhFileName: true,
      },
      data: {
        subtitleZhUrl,
        subtitleZhFileName,
      },
    });
  },

  async delete(id: string) {
    return prisma.episode.delete({ where: { episodeid: id } });
  },
};
