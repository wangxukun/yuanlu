import React from "react";
import { UserHomeStatsDto } from "@/core/stats/dto";

interface StreakBadgeProps {
  stats: UserHomeStatsDto;
}

/**
 * 右上角连胜徽章 —— 连胜天数 + 今日打卡进度动态提示
 *
 * 状态：
 * - 未达标：`今日打卡还差 X 分钟` + `🔥 连续 N 天`（灰色，徽章"未点亮"）
 * - 已达标：`今日打卡完成` + `🔥 连续 N 天`（accent 高亮，徽章"点亮"）
 * - 无连胜（N=0）时省去连胜段，避免出现"连续 0 天"
 *
 * 响应式：移动端（<sm）打卡进度与连胜拆为上下两行、缩小字号，
 * 防止长文本挤压问候语；sm（平板）及以上恢复单行展示。
 */
export default function StreakBadge({ stats }: StreakBadgeProps) {
  const { streakDays, remainingMins, dailyGoalAchieved } = stats;

  const progressText = dailyGoalAchieved
    ? "今日打卡完成"
    : `今日打卡还差 ${remainingMins} 分钟`;

  return (
    <span
      className={`shrink-0 inline-flex flex-col sm:flex-row items-end sm:items-center gap-0.5 sm:gap-1 rounded-full px-3 py-1.5 text-xs sm:text-sm font-semibold ${
        dailyGoalAchieved
          ? "bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300"
          : "bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300"
      }`}
    >
      <span className="whitespace-nowrap">{progressText}</span>
      {streakDays > 0 && (
        <span className="whitespace-nowrap">🔥 连续 {streakDays} 天</span>
      )}
    </span>
  );
}
