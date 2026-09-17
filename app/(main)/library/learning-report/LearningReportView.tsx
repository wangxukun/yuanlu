"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Flame,
  CalendarCheck,
  BookMarked,
  Lock,
  Lightbulb,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import type { LearningReportDto } from "@/core/stats/learning-report.service";
import { LearningHeatmap } from "@/components/stats/LearningHeatmap";
import { useUIStore } from "@/store/ui-store";

/**
 * [P3-f] 学习报表视图：
 * - 公共免费层：近 7 天简报（总时长 / 活跃天数 / 生词 + 逐日分钟条形）
 * - PRO 层：30/90/365 天趋势面积图 + 全年热力图 + 规则派生的智能学习建议
 * - 免费锁定层：虚线卡承载 PRO 权益 → openPremiumModal("stats_report")
 */
export function LearningReportView({
  report,
  isPremium,
}: {
  report: LearningReportDto;
  isPremium: boolean;
}) {
  const last7 = report.days.slice(-7);
  const totalMins = last7.reduce((s, d) => s + d.minutes, 0);
  const activeDays = last7.filter((d) => d.isActive).length;
  const wordsLearned = last7.reduce((s, d) => s + d.wordsLearned, 0);

  const [range, setRange] = useState<30 | 90 | 365>(90);
  const rangeDays = useMemo(
    () => report.days.slice(-range),
    [report.days, range],
  );

  const chartData = useMemo(
    () =>
      rangeDays.map((d) => ({
        date: d.date.slice(5),
        minutes: d.minutes,
      })),
    [rangeDays],
  );

  // 智能学习建议（规则派生，零 LLM）：按数据命中 2-3 条
  const suggestions = useMemo(() => {
    const list: string[] = [];
    const avgMins = Math.round(totalMins / 7);
    if (report.streakDays >= 3) {
      list.push(
        `连续打卡 ${report.streakDays} 天，节奏已经成型——保持"每天一集短播客"的惯性比时长更重要。`,
      );
    }
    if (avgMins > 0 && avgMins < report.dailyGoalMins) {
      list.push(
        `近 7 天日均 ${avgMins} 分钟，低于目标 ${report.dailyGoalMins} 分钟——通勤时打开自动连播，碎片时间就能补齐。`,
      );
    }
    if (activeDays >= 5) {
      list.push(
        `近 7 天学习 ${activeDays} 天，稳定性很好——可以把每日目标上调 10% 挑战一下自己。`,
      );
    } else if (activeDays > 0 && activeDays < 3) {
      list.push(
        "学习日还比较分散，试着固定一个时段（如睡前 15 分钟）培养触发习惯。",
      );
    }
    if (wordsLearned === 0) {
      list.push(
        "近 7 天没有新收生词——精听时遇到生词点一下查词收藏，复习闭环从这里开始。",
      );
    }
    if (list.length === 0) {
      list.push("继续保持，数据积累后这里会给出更具体的学习建议。");
    }
    return list.slice(0, 3);
  }, [
    report.streakDays,
    report.dailyGoalMins,
    totalMins,
    activeDays,
    wordsLearned,
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 xl:py-8 space-y-6 font-sans animate-in fade-in duration-300">
      {/* 页头 */}
      <div className="flex items-center gap-4">
        <Link
          href="/auth/personal-center"
          className="btn btn-circle btn-ghost"
          title="返回个人中心"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-base-content flex items-center gap-2">
            <BarChart3
              size={22}
              className="text-primary-600 dark:text-primary-400"
            />
            学习报表
          </h1>
          <p className="text-xs text-base-content/50 mt-0.5">
            {isPremium
              ? "PRO · 全年趋势、热力图与智能建议"
              : "近 7 天学习简报 · 升级 PRO 解锁全年报表"}
          </p>
        </div>
      </div>

      {/* 7 天简报统计卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-ink-900 rounded-2xl p-5 border border-base-200/60 dark:border-ink-800 shadow-sm">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-base-content/40">
            <BarChart3 size={12} /> 近 7 天时长
          </div>
          <div className="text-2xl font-black text-base-content mt-1.5">
            {Math.floor(totalMins / 60)}
            <span className="text-sm font-bold text-base-content/50">
              {" "}
              小时{" "}
            </span>
            {totalMins % 60}
            <span className="text-sm font-bold text-base-content/50"> 分</span>
          </div>
        </div>
        <div className="bg-white dark:bg-ink-900 rounded-2xl p-5 border border-base-200/60 dark:border-ink-800 shadow-sm">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-base-content/40">
            <CalendarCheck size={12} /> 目标达成
          </div>
          <div className="text-2xl font-black text-base-content mt-1.5">
            {activeDays}
            <span className="text-sm font-bold text-base-content/50">
              {" "}
              / 7 天
            </span>
          </div>
        </div>
        <div className="bg-white dark:bg-ink-900 rounded-2xl p-5 border border-base-200/60 dark:border-ink-800 shadow-sm">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-base-content/40">
            <Flame size={12} /> 连续打卡
          </div>
          <div className="text-2xl font-black text-base-content mt-1.5">
            {report.streakDays}
            <span className="text-sm font-bold text-base-content/50"> 天</span>
          </div>
        </div>
        <div className="bg-white dark:bg-ink-900 rounded-2xl p-5 border border-base-200/60 dark:border-ink-800 shadow-sm">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-base-content/40">
            <BookMarked size={12} /> 新收生词
          </div>
          <div className="text-2xl font-black text-base-content mt-1.5">
            {wordsLearned}
            <span className="text-sm font-bold text-base-content/50"> 个</span>
          </div>
        </div>
      </div>

      {/* 近 7 天逐日条形（免费层核心） */}
      <div className="bg-white dark:bg-ink-900 rounded-2xl p-6 border border-base-200/60 dark:border-ink-800 shadow-sm">
        <h2 className="text-base font-black text-base-content mb-4">
          近 7 天逐日学习
        </h2>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={last7.map((d) => ({
                date: d.date.slice(5),
                minutes: d.minutes,
              }))}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                opacity={0.1}
              />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={30} allowDecimals={false} />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value: number) => [`${value} 分钟`, "学习时长"]}
              />
              <Area
                type="monotone"
                dataKey="minutes"
                stroke="#4f46e5"
                fill="#4f46e5"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {isPremium ? (
        <>
          {/* 趋势报表（时间窗切换） */}
          <div className="bg-white dark:bg-ink-900 rounded-2xl p-6 border border-base-200/60 dark:border-ink-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-base-content">
                趋势报表
              </h2>
              <div className="join">
                {([30, 90, 365] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setRange(d)}
                    className={`join-item btn btn-xs rounded-lg font-bold ${
                      range === d
                        ? "btn-primary"
                        : "btn-ghost bg-base-100 border-base-300"
                    }`}
                  >
                    {d === 365 ? "年" : d === 90 ? "季" : "月"}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    opacity={0.1}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    width={30}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value: number) => [`${value} 分钟`, "学习时长"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="minutes"
                    stroke="#4f46e5"
                    fill="#4f46e5"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 全年热力图 */}
          <div className="bg-white dark:bg-ink-900 rounded-2xl p-6 border border-base-200/60 dark:border-ink-800 shadow-sm">
            <h2 className="text-base font-black text-base-content mb-4">
              全年学习热力图
            </h2>
            <LearningHeatmap days={report.days} />
          </div>

          {/* 智能学习建议 */}
          <div className="bg-white dark:bg-ink-900 rounded-2xl p-6 border border-base-200/60 dark:border-ink-800 shadow-sm">
            <h2 className="text-base font-black text-base-content mb-3 flex items-center gap-2">
              <Lightbulb size={16} className="text-amber-500" /> 智能学习建议
            </h2>
            <ul className="space-y-2.5">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-base-content/75 leading-relaxed"
                >
                  <span className="w-5 h-5 rounded-full bg-primary-600/10 dark:bg-primary-400/10 text-primary-600 dark:text-primary-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        /* 免费锁定层：PRO 报表权益承接（弹窗 + 埋点 = 验收红线） */
        <button
          type="button"
          onClick={() => useUIStore.getState().openPremiumModal("stats_report")}
          className="w-full rounded-2xl border border-dashed border-amber-400/60 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-500/5 hover:bg-amber-50 dark:hover:bg-amber-500/10 px-6 py-8 flex flex-col sm:flex-row items-center gap-5 transition-colors cursor-pointer text-left"
        >
          <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500 shrink-0">
            <Lock size={26} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-base-content">
              月 / 季 / 年趋势报表 · 全年热力图 · 智能学习建议
            </p>
            <p className="text-xs text-base-content/60 mt-1">
              你的每一步积累都值得被看清——PRO 解锁完整学习报表，回顾一年来的坚持
            </p>
          </div>
          <span className="btn btn-sm rounded-full border-0 bg-amber-500 hover:bg-amber-600 text-white shrink-0">
            解锁学习报表
          </span>
        </button>
      )}
    </div>
  );
}
