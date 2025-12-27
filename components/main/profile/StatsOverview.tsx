"use client";

import React, { useEffect, useState } from "react";
import {
  ClockIcon,
  ArrowTrendingUpIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import { UserProfileStatsDto } from "@/core/stats/dto";

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
          // 确保没有返回 error 对象
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

  if (loading) {
    // 简单的骨架屏占位
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-base-100 p-5 rounded-2xl shadow-sm border border-base-200 h-24"
          ></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Total Hours */}
      <div className="bg-base-100 p-5 rounded-2xl shadow-sm border border-base-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-base-content/50 uppercase tracking-wider">
              总小时数
            </p>
            <p className="mt-1 text-2xl font-bold text-base-content">
              {stats.totalHours}h
            </p>
          </div>
          <div className="bg-info/10 p-2 rounded-lg">
            <ClockIcon className="w-5 h-5 text-info" />
          </div>
        </div>
      </div>

      {/* Streak */}
      <div className="bg-base-100 p-5 rounded-2xl shadow-sm border border-base-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-base-content/50 uppercase tracking-wider">
              连续天数
            </p>
            <p className="mt-1 text-2xl font-bold text-base-content">
              {stats.streakDays}
            </p>
          </div>
          <div className="bg-error/10 p-2 rounded-lg">
            <ArrowTrendingUpIcon className="w-5 h-5 text-error" />
          </div>
        </div>
      </div>

      {/* Words */}
      <div className="bg-base-100 p-5 rounded-2xl shadow-sm border border-base-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-base-content/50 uppercase tracking-wider">
              词汇
            </p>
            <p className="mt-1 text-2xl font-bold text-base-content">
              {stats.wordsLearned}
            </p>
          </div>
          <div className="bg-secondary/10 p-2 rounded-lg">
            <BookOpenIcon className="w-5 h-5 text-secondary" />
          </div>
        </div>
      </div>
    </div>
  );
}
