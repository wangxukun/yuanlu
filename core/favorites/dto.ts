// core/favorites/dto.ts

import { tag } from "@prisma/client";

export interface FavoriteSeries {
  id: string;
  title: string;
  author: string; // 对应 podcast.title 或专门的 author 字段
  thumbnailUrl: string;
  category: tag[];
  episodeCount: number;
  plays: number;
  followers: number; // 难度等级
}

export interface FavoriteEpisode {
  id: string;
  title: string;
  author: string; // 所属播客标题
  thumbnailUrl: string;
  category: string;
  date: string; // 格式化后的日期
  duration: string;
  playCount: number;
  podcastId: string; // 用于跳转
}

// 基础响应结构，用于规范化 Service 层向上的返回格式
export interface BaseResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  code?: number;
}

// 播客/单集操作通用 DTO
export interface ToggleFavoriteDTO {
  userId: string;
  targetId: string; // podcastId 或 episodeId
}

export interface CheckFavoriteDTO {
  userId: string;
  targetId: string;
}

// 附加一些业务专用的返回体
export interface ToggleFavoriteResult {
  isFavorited: boolean;
}
