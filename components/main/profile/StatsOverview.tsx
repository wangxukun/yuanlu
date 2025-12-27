import React from "react";
import {
  ClockIcon,
  ArrowTrendingUpIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import { MOCK_STATS } from "./mock-data";

export default function StatsOverview() {
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
              {MOCK_STATS.totalHours}h
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
              {MOCK_STATS.streakDays}
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
              {MOCK_STATS.wordsLearned}
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
