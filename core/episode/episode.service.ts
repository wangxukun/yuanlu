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

export const episodeService = {
  /**
   * 音频管理列表
   * [修改] 支持根据 query (标题/描述) 和 podcastId 过滤
   */
  async getManagementList(query?: string, podcastId?: string) {
    // 构建查询条件
    const where: Prisma.episodeWhereInput = {};

    // 1. 如果有 podcastId，精确匹配
    if (podcastId) {
      where.podcastid = podcastId;
    }

    // 2. 如果有搜索词 query，模糊匹配标题
    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        // 如果需要也可以搜描述：
        // { description: { contains: query, mode: 'insensitive' } }
      ];
    }

    // 调用 Repository，传入构造好的 where 条件
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
   * 逻辑：根据用户设置的 learnLevel 筛选 published 状态的单集，按发布时间倒序
   */
  async getRecommendedEpisodes(
    userId?: string,
    limit: number = 4,
  ): Promise<{ level: string; items: RecommendedEpisodeDto[] }> {
    let targetDifficulty = "General";

    // 1. 获取用户偏好
    if (userId) {
      const profile = await prisma.user_profile.findUnique({
        where: { userid: userId },
        select: { learnLevel: true },
      });
      if (profile?.learnLevel) {
        // TODO: 考虑用户偏好的存储，这里假设是保存在数据库中，数据表user_profile中只有四种难度：General、Beginner  、Intermediate、Advanced
        // TODO: episode.difficulty 分级 General、A1、A2、B1、B2、C1、C2
        targetDifficulty = profile.learnLevel;
      }
    }

    // 2. 构造查询条件
    // 如果用户有特定等级偏好，尝试匹配该等级；否则（或查不到时）可以放宽条件
    // 这里为了演示，我们优先匹配等级，如果等级是 "General" 则不限制难度
    const where: Prisma.episodeWhereInput = {
      status: "published",
    };

    if (targetDifficulty !== "General") {
      where.difficulty = targetDifficulty;
    }

    // 3. 查询数据库
    let episodes = await episodeRepository.findAll(where);

    // 4. 兜底策略：如果按难度没查到数据（比如新用户选了生僻等级但库里没有），则去掉难度限制查最新的
    if (episodes.length === 0 && targetDifficulty !== "General") {
      console.log(
        `[Recommendation] No episodes found for level ${targetDifficulty}, falling back to all.`,
      );
      targetDifficulty = "General"; // 重置显示的标签为通用
      episodes = await episodeRepository.findAll({ status: "published" });
    }

    // 截取指定数量 (Repository 的 findAll 如果没做分页，这里手动 slice，或者建议 Repository 加 take 参数)
    // 考虑到 Repository findAll 默认按时间倒序，我们取前 limit 个即可
    const selectedEpisodes = episodes.slice(0, limit);

    // 5. 映射为 DTO
    const items: RecommendedEpisodeDto[] = await Promise.all(
      selectedEpisodes.map(async (ep) => {
        // 处理封面签名
        const coverUrl = await generateSignatureUrl(
          ep.coverFileName || "",
          3600 * 3,
        ).catch(() => ep.coverUrl); // 失败降级使用库里的 url

        // 格式化时长
        const durationMins = Math.floor(ep.duration / 60);

        // 获取分类 (取第一个 Tag，如果没有则显示播客名或 Difficulty)
        // 注意：Repository 的 findAll 需要包含 tags 的查询
        // 修正：当前的 episodeRepository.findAll 并没有 select tags。
        // 我们需要修改 repository 或者在这里重新 fetch。
        // 鉴于性能，建议 **修改 repository** 或使用 **prisma include**。
        //
        // *临时方案*：如果在 Repository findAll 中加上 tags: { take: 1 } 会更好。
        // 假设 repository 还没改，我们这里暂时用 difficulty 或 fallback。
        // 为了完美实现，请确保 Repository 的 findAll select 中加入了 tags。

        return {
          id: ep.episodeid,
          title: ep.title,
          podcastTitle: ep.podcast?.title || "Unknown Podcast",
          category: ep.difficulty || "General", // 暂时用难度代替分类，或者去修改 Repository
          duration: `${durationMins} min`,
          coverUrl: coverUrl,
          difficulty: ep.difficulty || "General",
        };
      }),
    );

    return {
      level: targetDifficulty,
      items,
    };
  },
};
