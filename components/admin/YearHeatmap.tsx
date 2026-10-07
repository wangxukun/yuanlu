"use client";

import React from "react";

/**
 * 管理端通用年度热力图（GitHub 风格，轻量自绘 div grid）。
 *
 * 与用户侧 components/stats/LearningHeatmap 同构：列为周（周一为第一行）、
 * 按月标注、5 档颜色按相对期内最大值分档；此处泛化为任意 value 序列，
 * 供转化分析页的"全年在线人数 / 注册人数"复用。
 */

export interface YearHeatmapDay {
  date: string; // yyyy-MM-dd
  value: number;
}

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

/** 数值 → 颜色档位（0-4）；max 为期内最大单日值 */
function levelOf(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0) return 0;
  if (max <= 0) return 1;
  const ratio = value / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/** 设计系统合法色板的两套 5 档配色（0 档共用空底色） */
export const HEATMAP_PRIMARY_LEVELS = [
  "bg-base-200 dark:bg-ink-800",
  "bg-primary-200 dark:bg-primary-900",
  "bg-primary-400 dark:bg-primary-700",
  "bg-primary-500 dark:bg-primary-500",
  "bg-primary-600 dark:bg-primary-400",
];

export const HEATMAP_INFO_LEVELS = [
  "bg-base-200 dark:bg-ink-800",
  "bg-info-200 dark:bg-info-900",
  "bg-info-400 dark:bg-info-700",
  "bg-info-500 dark:bg-info-500",
  "bg-info-600 dark:bg-info-400",
];

export const HEATMAP_ACCENT_LEVELS = [
  "bg-base-200 dark:bg-ink-800",
  "bg-accent-200 dark:bg-accent-900",
  "bg-accent-400 dark:bg-accent-700",
  "bg-accent-500 dark:bg-accent-500",
  "bg-accent-600 dark:bg-accent-400",
];

export function YearHeatmap({
  days,
  levels,
  unit = "人",
}: {
  days: YearHeatmapDay[];
  levels: string[];
  unit?: string;
}) {
  if (days.length === 0) return null;

  // 解析为 {date, value, dt} 序列并计算周行号（周一=0）
  const parsed = days.map((d) => {
    const dt = new Date(d.date + "T00:00:00Z");
    const row = (dt.getUTCDay() + 6) % 7;
    return { ...d, row, dt };
  });

  const max = Math.max(...days.map((d) => d.value), 1);

  // 首日前置空格对齐到周一列
  const firstRow = parsed[0].row;
  const cells: ((typeof parsed)[number] | null)[] = [
    ...Array.from({ length: firstRow }, () => null),
    ...parsed,
  ];
  const weeks: ((typeof parsed)[number] | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  // 每列月份标注：每列第一格所在月与前一列不同时标注
  const monthLabels = weeks.map((week, i) => {
    const first = week.find((c) => c !== null);
    if (!first) return "";
    const m = first.dt.getUTCMonth();
    const prev = i > 0 ? weeks[i - 1].find((c) => c !== null) : null;
    if (!prev || prev.dt.getUTCMonth() !== m) {
      return `${m + 1}月`;
    }
    return "";
  });

  return (
    <div className="overflow-x-auto pb-1">
      <div className="min-w-max">
        {/* 月份行 */}
        <div
          className="grid gap-[3px] mb-1"
          style={{ gridTemplateColumns: `repeat(${weeks.length}, 12px)` }}
        >
          {monthLabels.map((label, i) => (
            <span
              key={i}
              className="text-[9px] font-bold text-base-content/40 whitespace-nowrap"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          {/* 周几标注列 */}
          <div
            className="grid gap-[3px] mr-1"
            style={{ gridTemplateRows: "repeat(7, 12px)" }}
          >
            {WEEKDAY_LABELS.map((w, i) => (
              <span
                key={i}
                className="text-[9px] font-bold text-base-content/30 leading-[12px] text-right w-3"
              >
                {i % 2 === 0 ? w : ""}
              </span>
            ))}
          </div>
          {/* 热力格主体 */}
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div
                key={wi}
                className="grid gap-[3px]"
                style={{ gridTemplateRows: "repeat(7, 12px)" }}
              >
                {Array.from({ length: 7 }, (_, di) => {
                  const cell = week[di];
                  if (cell === null || cell === undefined) {
                    return <span key={di} className="w-[12px] h-[12px]" />;
                  }
                  return (
                    <span
                      key={di}
                      title={`${cell.date}：${cell.value} ${unit}`}
                      className={`w-[12px] h-[12px] rounded-[3px] ${levels[levelOf(cell.value, max)]} transition-transform hover:scale-125`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {/* 图例 */}
        <div className="flex items-center gap-1 mt-2 text-[9px] font-bold text-base-content/40">
          <span>少</span>
          {levels.map((cls, i) => (
            <span
              key={i}
              className={`w-[10px] h-[10px] rounded-[2px] ${cls}`}
            />
          ))}
          <span>多</span>
        </div>
      </div>
    </div>
  );
}
