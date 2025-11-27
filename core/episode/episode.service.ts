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

export const episodeService = {
  async getManagementList() {
    const episodes = await episodeRepository.findAll();
    return episodes.map(EpisodeMapper.toManagementItem);
  },
};
