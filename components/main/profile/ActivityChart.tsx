"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { WeeklyActivityItemDto } from "@/core/stats/dto";

export default function ActivityChart() {
  const [data, setData] = useState<WeeklyActivityItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const fetchActivity = useCallback(async (offset: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/user/stats/weekly-activity?weekOffset=${offset}`,
      );
      if (res.ok) {
        const result = await res.json();
        if (result.weeklyActivity) {
          setData(result.weeklyActivity);
        }
      }
    } catch (error) {
      console.error("Failed to fetch weekly activity:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity(weekOffset);
  }, [weekOffset, fetchActivity]);

  return (
    <div className="bg-white dark:bg-ink-900 p-6 rounded-2xl border border-ink-100 dark:border-ink-800">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-ink-900 dark:text-ink-50">
          本周行程记录
        </h3>
        <div className="flex items-center bg-ink-50 dark:bg-ink-800 p-1 rounded-full">
          <button
            onClick={() => setWeekOffset(0)}
            className={`px-4 py-1 text-sm rounded-full transition-all duration-300 ${
              weekOffset === 0
                ? "bg-white dark:bg-ink-700 text-primary-600 shadow-sm font-bold"
                : "text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300"
            }`}
          >
            本周
          </button>
          <button
            onClick={() => setWeekOffset(1)}
            className={`px-4 py-1 text-sm rounded-full transition-all duration-300 ${
              weekOffset === 1
                ? "bg-white dark:bg-ink-700 text-primary-600 shadow-sm font-bold"
                : "text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300"
            }`}
          >
            上周
          </button>
        </div>
      </div>
      <div className="h-64 w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--primary-500)"
                    stopOpacity={0.15}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--primary-500)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              {/* CartesianGrid removed — cleaner single-color aesthetic */}
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--ink-400)", fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--ink-400)", fontSize: 12 }}
                unit="m"
                width={36}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "var(--r-md)",
                  border: "1px solid var(--ink-200)",
                  boxShadow: "var(--e1)",
                  backgroundColor: "var(--ink-50)",
                  color: "var(--ink-900)",
                }}
                labelStyle={{ color: "var(--ink-500)", fontWeight: 500 }}
                cursor={{ stroke: "var(--primary-300)", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="minutes"
                stroke="var(--primary-600)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorMinutes)"
                dot={{
                  r: 3,
                  fill: "var(--primary-600)",
                  stroke: "white",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 5,
                  fill: "var(--primary-600)",
                  stroke: "white",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
