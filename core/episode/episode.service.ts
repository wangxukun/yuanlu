/**
 * Service 层 = 整合所有逻辑，并对外提供清晰的业务功能
 * Service 是后端的核心，负责：
 * 合并 Repository 查询
 * 合并 Mapper 输出
 * 验证输入参数
 * 判断权限
 * 处理业务流程（例如：状态变化、发布/下线逻辑）
 * 错误处理
 * 事务（Prisma transaction）
 * 缓存处理（如 Redis）
 * 写日志
 * 调用第三方服务
 * 这些东西不能写在 API Route。
 * 如果不经过 Service：
 * 你会把逻辑写到 route.ts → route.ts 越来越臃肿 → 无法复用 → 无法测试 → 最后变成屎山
 */
import { episodeRepository } from "./episode.repository";
import { EpisodeMapper } from "@/core/episode/episode.mapper";
import { generateSignatureUrl } from "@/lib/oss";
import { Prisma } from "@prisma/client";
import { EditEpisodeResponse } from "@/app/types/podcast";
import prisma from "@/lib/prisma";

/**
 * 音频管理列表
 */
export const episodeService = {
  async getManagementList() {
    const episodes = await episodeRepository.findAll();
    if (episodes.length > 0) {
      for (const episode of episodes) {
        // 获取封面图片的签名URL
        episode.coverUrl = await generateSignatureUrl(
          episode.coverFileName,
          60 * 60 * 3,
        );
      }
    }
    return episodes.map(EpisodeMapper.toManagementItem);
  },

  /**
   * 音频编辑填充数据
   * @param id
   */
  async getEditItem(id: string) {
    const episode = await episodeRepository.findById(id);
    episode.audioUrl = await generateSignatureUrl(
      episode.audioFileName,
      60 * 60 * 3,
    );
    return EpisodeMapper.toEditItem(episode);
  },

  /**
   * 音频更新，更新除了音频文件、封面文件、字幕文件以外的所有字段
   * @param id
   * @param data
   */
  async update(
    id: string,
    data: Prisma.episodeUpdateInput,
  ): Promise<EditEpisodeResponse> {
    const updateEpisode = await episodeRepository.update(id, data);
    return EpisodeMapper.toUpdateState(updateEpisode);
  },

  async getSubtitles(id: string) {
    const episode = await episodeRepository.findById(id);
    episode.coverUrl = await generateSignatureUrl(
      episode.coverFileName,
      60 * 60 * 3,
    );
    if (episode.subtitleEnFileName) {
      episode.subtitleEnUrl = await generateSignatureUrl(
        episode.subtitleEnFileName,
        60 * 60 * 3,
      );
    }
    if (episode.subtitleZhFileName) {
      episode.subtitleZhUrl = await generateSignatureUrl(
        episode.subtitleZhFileName,
        60 * 60 * 3,
      );
    }
    return EpisodeMapper.toSubtitles(episode);
  },

  /**
   * 更新英文字幕
   * @param id
   * @param data
   */
  async updateSubtitleEn(
    id: string,
    data: Prisma.episodeUpdateInput,
  ): Promise<EditEpisodeResponse> {
    const updatedSubtitleEn = await episodeRepository.updateSubtitleEn(
      id,
      data,
    );
    return EpisodeMapper.toUpdateSubtitleEnState(updatedSubtitleEn);
  },

  /**
   * 更新中文字幕
   * @param id
   * @param data
   */
  async updateSubtitleZh(
    id: string,
    data: Prisma.episodeUpdateInput,
  ): Promise<EditEpisodeResponse> {
    const updatedSubtitleZh = await episodeRepository.updateSubtitleZh(
      id,
      data,
    );
    return EpisodeMapper.toUpdateSubtitleZhState(updatedSubtitleZh);
  },

  /**
   * 删除episode
   * @param id episode id
   */
  async delete(id: string) {
    // 先删除episode_tags表中关联的标签数据
    await prisma.episode_tags.deleteMany({
      where: {
        episodeid: id,
      },
    });
    await episodeRepository.delete(id);
    return EpisodeMapper.toDeleteState();
  },

  /**
   * 获取episode的oss文件信息
   * @param id episode id
   */
  async getEpisodeOSSFiles(id: string) {
    const episode = await episodeRepository.findById(id);
    return EpisodeMapper.toEpisodeOSSFiles(episode);
  },
};
