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
import { RecommendedEpisodeDto } from "@/core/episode/dto/recommended-episode.dto";
import prisma from "@/lib/prisma";

// [新增] 难度映射表：将用户配置的粗粒度等级映射为剧集的细粒度 CEFR 标准
const LEVEL_MAPPING: Record<string, string[]> = {
  Beginner: ["A1", "A2"],
  Intermediate: ["B1", "B2"],
  Advanced: ["C1", "C2"],
  General: ["General"], // General 用户匹配 General 内容
};

export const episodeService = {
  /**
   * 音频管理列表
   * 支持根据 query (标题/描述) 和 podcastId 过滤
   */
  async getManagementList(query?: string, podcastId?: string) {
    const where: Prisma.episodeWhereInput = {};

    if (podcastId) {
      where.podcastid = podcastId;
    }

    if (query) {
      where.OR = [{ title: { contains: query, mode: "insensitive" } }];
    }

    const episodes = await episodeRepository.findAll(where);

    if (episodes.length > 0) {
      for (const episode of episodes) {
        episode.coverUrl = await generateSignatureUrl(
          episode.coverFileName,
          60 * 60 * 3,
        );
      }
    }
    return episodes.map(EpisodeMapper.toManagementItem);
  },

  async getEditItem(id: string) {
    const episode = await episodeRepository.findById(id);
    episode.audioUrl = await generateSignatureUrl(
      episode.audioFileName,
      60 * 60 * 3,
    );
    return EpisodeMapper.toEditItem(episode);
  },

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

  async delete(id: string) {
    await episodeRepository.delete(id);
    return EpisodeMapper.toDeleteState();
  },

  async getEpisodeOSSFiles(id: string) {
    const episode = await episodeRepository.findById(id);
    return EpisodeMapper.toEpisodeOSSFiles(episode);
  },

  /**
   * 获取推荐单集
   * 逻辑：根据用户设置的 learnLevel (Beginner/Intermediate/Advanced)
   * 映射到对应的 episode.difficulty (A1-C2) 进行筛选
   */
  async getRecommendedEpisodes(
    userId?: string,
    limit: number = 4,
  ): Promise<{ level: string; items: RecommendedEpisodeDto[] }> {
    let userLevelLabel = "General"; // 显示给前端看的标签（如 "Intermediate"）
    let targetDifficulties: string[] = []; // 实际查询数据库用的难度列表（如 ["B1", "B2"]）

    // 1. 获取用户偏好并进行映射
    if (userId) {
      const profile = await prisma.user_profile.findUnique({
        where: { userid: userId },
        select: { learnLevel: true },
      });

      if (profile?.learnLevel) {
        userLevelLabel = profile.learnLevel;
        // 根据映射表获取对应的难度列表
        targetDifficulties = LEVEL_MAPPING[profile.learnLevel] || [];
      }
    }

    // 2. 构造查询条件
    const where: Prisma.episodeWhereInput = {
      status: "published",
    };

    // 如果映射出了具体的难度等级（例如不是空数组，也不是默认兜底），则加上筛选条件
    if (targetDifficulties.length > 0 && userLevelLabel !== "General") {
      where.difficulty = { in: targetDifficulties };
    }

    // 3. 查询数据库
    let episodes = await episodeRepository.findAll(where);

    // 4. 兜底策略：
    // 如果按难度没查到数据（比如新用户选了 Advanced 但库里没有 C1/C2 的内容）
    // 或者用户选的是 General（我们假设 General 看所有内容或者 fallback 到所有）
    if (episodes.length === 0) {
      console.log(
        `[Recommendation] No episodes found for level ${userLevelLabel} (mapped to ${targetDifficulties.join(",")}), falling back to all published.`,
      );
      // 重置显示的标签为 "精选" 或 "最新" (前端对应 General 逻辑)
      userLevelLabel = "General";
      // 查所有已发布内容
      episodes = await episodeRepository.findAll({ status: "published" });
    }

    // 5. 截取并映射 DTO
    // 注意：Repository findAll 默认按 publishAt 倒序，取前 limit 个即为最新的推荐
    const selectedEpisodes = episodes.slice(0, limit);

    const items: RecommendedEpisodeDto[] = await Promise.all(
      selectedEpisodes.map(async (ep) => {
        // 处理封面签名
        const coverUrl = await generateSignatureUrl(
          ep.coverFileName || "",
          3600 * 3,
        ).catch(() => ep.coverUrl);

        const durationMins = Math.floor(ep.duration / 60);

        // 获取分类逻辑：
        // 优先使用第一个 Tag 的名称
        // 如果没有 Tag，使用难度等级作为分类展示
        // 需要确保 Repository.findAll 中包含了 tags 的 include/select
        const category =
          ep.tags && ep.tags.length > 0
            ? ep.tags[0].name
            : ep.difficulty || "General";

        return {
          id: ep.episodeid,
          title: ep.title,
          podcastTitle: ep.podcast?.title || "Unknown Podcast",
          category: category,
          duration: `${durationMins} min`,
          coverUrl: coverUrl,
          difficulty: ep.difficulty || "General",
        };
      }),
    );

    return {
      level: userLevelLabel, // 返回用户的原始等级设置 (如 "Intermediate")，前端用于显示 "为您推荐 - 中级"
      items,
    };
  },
};
