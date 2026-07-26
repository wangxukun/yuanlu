"use client";

import React, { useEffect, useState } from "react";
import { UserProfileStatsDto } from "@/core/stats/dto";

/** 步行速度 5km/h → 1 小时收听 = 5km 里程 */
const KM_PER_HOUR = 5;

export default function StatsOverview() {
  const [stats, setStats] = useState<UserProfileStatsDto>({
    totalHours: 0,
    streakDays: 0,
    wordsLearned: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/user/stats/overview");
        if (res.ok) {
          const data = await res.json();
          if (!data.error) {
            setStats(data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch stats overview:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const totalKm = stats.totalHours * KM_PER_HOUR;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-ink-900 p-5 rounded-2xl border border-ink-100 dark:border-ink-800 h-28"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* 累计里程 */}
      <div className="bg-white dark:bg-ink-900 p-5 rounded-2xl border border-ink-100 dark:border-ink-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-ink-400 uppercase tracking-wider">
              累计里程
            </p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold text-ink-900 dark:text-ink-50">
                {totalKm.toFixed(1)}
              </span>
              <span className="text-sm font-medium text-ink-400">km</span>
            </div>
            <p className="mt-0.5 text-[11px] text-ink-400">
              {stats.totalHours}h 精听
            </p>
          </div>
          <div className="bg-primary-50 dark:bg-primary-900/30 p-2.5 rounded-xl">
            <span
              className="material-symbols-outlined text-xl text-primary-600 dark:text-primary-400"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              hiking
            </span>
          </div>
        </div>
      </div>

      {/* 连续天数 */}
      <div className="bg-white dark:bg-ink-900 p-5 rounded-2xl border border-ink-100 dark:border-ink-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-ink-400 uppercase tracking-wider">
              连续天数
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display text-3xl font-bold text-ink-900 dark:text-ink-50">
                {stats.streakDays}
              </span>
              <span className="text-sm font-medium text-ink-400">天</span>
            </div>
          </div>
          <div className="bg-accent-50 dark:bg-accent-900/30 p-2.5 rounded-xl">
            <span
              className="material-symbols-outlined text-xl text-accent-600 dark:text-accent-400"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
          </div>
        </div>
      </div>

      {/* 词汇路标 */}
      <div className="bg-white dark:bg-ink-900 p-5 rounded-2xl border border-ink-100 dark:border-ink-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-ink-400 uppercase tracking-wider">
              词汇路标
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display text-3xl font-bold text-ink-900 dark:text-ink-50">
                {stats.wordsLearned}
              </span>
              <span className="text-sm font-medium text-ink-400">词</span>
            </div>
          </div>
          <div className="bg-info-50 dark:bg-info-900/30 p-2.5 rounded-xl">
            <span
              className="material-symbols-outlined text-xl text-info-500 dark:text-info-400"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bookmark
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
