import React from "react";
import { UserHomeStatsDto } from "@/core/stats/dto";

interface WeeklyMileageCardProps {
  stats: UserHomeStatsDto;
}

/** 步行速度 5km/h → 1 小时收听 = 5km 里程 */
const KM_PER_HOUR = 5;

/**
 * 本周里程卡 —— 把收听时长翻译成"行走距离"，
 * 让学习进度与「远路」的品牌隐喻绑定。
 */
export default function WeeklyMileageCard({ stats }: WeeklyMileageCardProps) {
  const kmCurrent = stats.listeningTimeCurrent * KM_PER_HOUR;
  const kmGoal = stats.listeningTimeGoal * KM_PER_HOUR;

  const progress = kmGoal > 0 ? Math.min(100, (kmCurrent / kmGoal) * 100) : 0;

  const remainingMins = Math.max(
    0,
    Math.round((stats.listeningTimeGoal - stats.listeningTimeCurrent) * 60),
  );

  const wordsProgress =
    stats.wordsLearnedGoal > 0
      ? Math.min(
          100,
          (stats.wordsLearnedCurrent / stats.wordsLearnedGoal) * 100,
        )
      : 0;

  return (
    <div className="md:w-80 bg-white dark:bg-ink-900 rounded-2xl border border-ink-100 dark:border-ink-800 p-6 flex flex-col justify-center gap-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-ink-900 dark:text-ink-50">
          本周里程
        </h3>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            stats.weeklyProgress >= 0
              ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
              : "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
          }`}
        >
          {stats.weeklyProgress >= 0 ? "+" : ""}
          {stats.weeklyProgress}%
        </span>
      </div>

      {/* 里程主数字 */}
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-3xl font-bold text-ink-900 dark:text-ink-50">
            {kmCurrent.toFixed(1)}
          </span>
          <span className="text-sm text-ink-400">/ {kmGoal} km</span>
        </div>
        {/* 路形进度条 */}
        <div className="mt-3 w-full bg-ink-100 dark:bg-ink-800 rounded-full h-1.5">
          <div
            className="bg-primary-500 h-1.5 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-ink-400">
          {remainingMins <= 0
            ? "本周目标已达成，走得漂亮！"
            : `再走 ${remainingMins} 分钟达成周目标`}
        </p>
      </div>

      {/* 词汇路标 */}
      <div>
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-ink-500">词汇路标</span>
          <span className="font-medium text-ink-900 dark:text-ink-50">
            {stats.wordsLearnedCurrent} / {stats.wordsLearnedGoal}
          </span>
        </div>
        <div className="w-full bg-ink-100 dark:bg-ink-800 rounded-full h-1.5">
          <div
            className="bg-accent-500 h-1.5 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${wordsProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
