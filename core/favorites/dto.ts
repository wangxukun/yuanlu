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
