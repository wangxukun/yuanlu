import React from "react";
import { UserHomeStatsDto } from "@/core/stats/dto";

interface UserStatsCardProps {
  stats: UserHomeStatsDto;
}

export default function UserStatsCard({ stats }: UserStatsCardProps) {
  // 计算进度条百分比，限制在 0-100 之间
  // listeningTimeGoal 可能为 0 (虽然我们设置了默认值)，做个保护
  const listeningProgress =
    stats.listeningTimeGoal > 0
      ? Math.min(
          100,
          (stats.listeningTimeCurrent / stats.listeningTimeGoal) * 100,
        )
      : 0;

  const wordsProgress =
    stats.wordsLearnedGoal > 0
      ? Math.min(
          100,
          (stats.wordsLearnedCurrent / stats.wordsLearnedGoal) * 100,
        )
      : 0;

  return (
    <div className="md:w-80 bg-base-100 rounded-3xl p-6 shadow-sm border border-base-200 flex flex-col justify-center">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-base-content">每周进度</h3>
        {/* 展示周环比增长 */}
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            stats.weeklyProgress >= 0
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {stats.weeklyProgress >= 0 ? "+" : ""}
          {stats.weeklyProgress}%
        </span>
      </div>

      <div className="space-y-4">
        {/* Listening Time */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-base-content/60">收听时间</span>
            <span className="font-medium text-base-content">
              {stats.listeningTimeCurrent} / {stats.listeningTimeGoal}h
            </span>
          </div>
          <div className="w-full bg-base-200 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${listeningProgress}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Words Learned */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-base-content/60">学习单词</span>
            <span className="font-medium text-base-content">
              {stats.wordsLearnedCurrent} / {stats.wordsLearnedGoal}
            </span>
          </div>
          <div className="w-full bg-base-200 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${wordsProgress}%`,
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
