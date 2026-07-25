"use server";

import { analyticsService } from "@/core/analytics/analytics.service";

/**
 * 增加播放量 (原子操作)
 * 同时更新单集播放量和所属播客的总播放量
 */
export async function incrementPlayCount(episodeId: string, podcastId: string) {
  try {
    await analyticsService.incrementPlayCount(episodeId, podcastId);
  } catch (error) {
    console.error("Failed to increment play count via action:", error);
  }
}
