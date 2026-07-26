"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
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

  const handleWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setWeekOffset(parseInt(e.target.value, 10));
  };

  return (
    <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-base-content">
          每周学习活动
        </h3>
        <select
          className="select select-sm select-bordered bg-base-200/50"
          value={weekOffset}
          onChange={handleWeekChange}
        >
          <option value={0}>本周</option>
          <option value={1}>上周</option>
        </select>
      </div>
      <div className="h-64 w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <span className="loading loading-spinner loading-md text-primary"></span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1F7A5C" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1F7A5C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(0,0,0,0.1)"
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#A79E8A", fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#A79E8A", fontSize: 12 }}
                unit="m"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Area
                type="monotone"
                dataKey="minutes"
                stroke="#1F7A5C"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorMinutes)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
