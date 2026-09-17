"use client";

import React from "react";
import type { DailyActivityPoint } from "@/core/stats/learning-report.service";

/**
 * [P3-f] 全年学习热力图（GitHub 风格，轻量自绘 div grid——不引入重型图表库）。
 *
 * 布局：列为周（周一为每周第一行），按月标注；5 档颜色按相对当日最大时长分档。
 * 数据为连续逐日序列（service 已补零），从首列首个周一开始对齐。
 */

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

/** 分钟数 → 颜色档位（0-4）；max 为期内最大单日分钟数 */
function levelOf(minutes: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (max <= 0) return 1;
  const ratio = minutes / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

const LEVEL_CLASSES = [
  "bg-base-200 dark:bg-ink-800",
  "bg-primary-200 dark:bg-primary-900",
  "bg-primary-400 dark:bg-primary-700",
  "bg-primary-500 dark:bg-primary-500",
  "bg-primary-600 dark:bg-primary-400",
];

export function LearningHeatmap({ days }: { days: DailyActivityPoint[] }) {
  if (days.length === 0) return null;

  // 解析为 {date, minutes, iso(周几)} 序列
  const parsed = days.map((d) => {
    const dt = new Date(d.date + "T00:00:00Z");
    // getUTCDay: 0=周日 → 转为周一=0 的行号
    const row = (dt.getUTCDay() + 6) % 7;
    return { ...d, row, dt };
  });

  const max = Math.max(...days.map((d) => d.minutes), 1);

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

  const fmt = (d: DailyActivityPoint) =>
    `${d.date}：${d.minutes} 分钟${d.isActive ? " · 已达标" : ""}`;

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
                      title={fmt(cell)}
                      className={`w-[12px] h-[12px] rounded-[3px] ${LEVEL_CLASSES[levelOf(cell.minutes, max)]} transition-transform hover:scale-125`}
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
          {LEVEL_CLASSES.map((cls, i) => (
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
