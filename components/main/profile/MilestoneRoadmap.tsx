"use client";

import React, { useEffect, useState } from "react";
import { UserProfileStatsDto } from "@/core/stats/dto";

/** 步行速度 5km/h → 1 小时收听 = 5km 里程 */
const KM_PER_HOUR = 5;

interface Milestone {
  km: number;
  label: string;
  emoji: string;
}

const MILESTONES: Milestone[] = [
  { km: 1, label: "起步", emoji: "flag" },
  { km: 5, label: "小径", emoji: "park" },
  { km: 21.1, label: "半马", emoji: "directions_run" },
  { km: 42.2, label: "全马", emoji: "military_tech" },
  { km: 100, label: "远路", emoji: "landscape" },
];

interface RoadmapStripProps {
  totalKm: number;
  W: number;
  H: number;
  pad: number;
  r: number;
  font: number;
}

function RoadmapStrip({ totalKm, W, H, pad, r, font }: RoadmapStripProps) {
  const count = MILESTONES.length;
  const xs = MILESTONES.map((_, i) => pad + (i * (W - pad * 2)) / (count - 1));

  // Gentle undulating path
  const base = H * 0.48;
  const amp = H * 0.08;
  const ys = [
    base + amp,
    base - amp,
    base + amp * 0.7,
    base - amp * 0.9,
    base + amp * 0.5,
  ];

  // Build smooth SVG curve
  let d = `M${xs[0]},${ys[0]}`;
  for (let i = 1; i < xs.length; i++) {
    const mx = (xs[i - 1] + xs[i]) / 2;
    const my = (ys[i - 1] + ys[i]) / 2;
    d += ` Q${xs[i - 1]},${ys[i - 1]} ${mx},${my}`;
  }
  d += ` L${xs[xs.length - 1]},${ys[ys.length - 1]}`;

  // Current progress position on path (capped at 100km)
  const maxKm = MILESTONES[MILESTONES.length - 1].km;
  const progressRatio = Math.min(1, totalKm / maxKm);
  const progressX = pad + progressRatio * (W - pad * 2);
  // Interpolate y from the path
  const segmentIndex = Math.min(
    count - 2,
    Math.floor(progressRatio * (count - 1)),
  );
  const segmentT =
    (progressRatio * (count - 1) - segmentIndex) / Math.max(0.001, 1);
  const progressY =
    ys[segmentIndex] + (ys[segmentIndex + 1] - ys[segmentIndex]) * segmentT;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto select-none"
      role="img"
      aria-label="累计里程碑路图"
    >
      {/* Trail path */}
      <path
        d={d}
        fill="none"
        stroke="var(--ink-200)"
        strokeWidth="2.5"
        strokeDasharray="0.1 9"
        strokeLinecap="round"
      />

      {/* Completed portion of path */}
      <path
        d={d}
        fill="none"
        stroke="var(--primary-500)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${progressRatio * 1000} 9999`}
      />

      {/* Milestone nodes */}
      {MILESTONES.map((ms, i) => {
        const reached = totalKm >= ms.km;
        const x = xs[i];
        const y = ys[i];
        return (
          <g key={ms.km} transform={`translate(${x},${y})`}>
            <title>
              {ms.label} · {ms.km} km{reached ? " ✓ 已达成" : ""}
            </title>

            {/* Node circle */}
            <circle
              r={r}
              className={
                reached ? "fill-primary-500" : "fill-white dark:fill-ink-800"
              }
              stroke={reached ? "none" : "var(--ink-300)"}
              strokeWidth="1.5"
            />

            {/* Flag for reached milestones */}
            {reached && (
              <path
                d={`M0,${-r} L0,${-r - 12} L10,${-r - 8.5} L0,${-r - 5} Z`}
                fill="var(--accent-500)"
              />
            )}

            {/* Milestone label (below node) */}
            <text
              y={r + font + 6}
              textAnchor="middle"
              fontSize={font}
              fill={reached ? "var(--primary-700)" : "var(--ink-400)"}
              fontWeight={reached ? 600 : 400}
              className="dark:fill-inherit"
              style={reached ? undefined : { fill: "var(--ink-400)" }}
            >
              {ms.label}
            </text>

            {/* Km label (above flag or above node) */}
            <text
              y={reached ? -r - 16 : -r - 8}
              textAnchor="middle"
              fontSize={font - 1}
              fill={reached ? "var(--accent-600)" : "var(--ink-300)"}
              fontWeight={500}
            >
              {ms.km}km
            </text>
          </g>
        );
      })}

      {/* Current position pulsing dot */}
      {totalKm > 0 && totalKm < maxKm && (
        <g transform={`translate(${progressX},${progressY})`}>
          <circle r={r + 4} fill="var(--primary-200)" opacity="0.5">
            <animate
              attributeName="r"
              values={`${r + 2};${r + 8};${r + 2}`}
              dur="2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.5;0.15;0.5"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle r={4} fill="var(--primary-600)" />
        </g>
      )}
    </svg>
  );
}

/**
 * 远路里程碑路图
 * 把用户累计收听时长翻译成里程，可视化在一条蜿蜒的旅程路径上。
 */
export default function MilestoneRoadmap() {
  const [totalKm, setTotalKm] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/user/stats/overview");
        if (res.ok) {
          const data: UserProfileStatsDto = await res.json();
          if (!("error" in data)) {
            setTotalKm(data.totalHours * KM_PER_HOUR);
          }
        }
      } catch (error) {
        console.error("Failed to fetch stats for roadmap:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-ink-900 p-6 rounded-2xl border border-ink-100 dark:border-ink-800 h-48 animate-pulse" />
    );
  }

  return (
    <div className="bg-white dark:bg-ink-900 p-6 rounded-2xl border border-ink-100 dark:border-ink-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-ink-900 dark:text-ink-50">
          远路里程碑
        </h3>
        <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2.5 py-1 rounded-full">
          {totalKm.toFixed(1)} km
        </span>
      </div>

      {/* Mobile strip */}
      <div className="sm:hidden">
        <RoadmapStrip
          totalKm={totalKm}
          W={360}
          H={110}
          pad={36}
          r={6}
          font={10}
        />
      </div>
      {/* Desktop strip */}
      <div className="hidden sm:block max-w-3xl mx-auto">
        <RoadmapStrip
          totalKm={totalKm}
          W={700}
          H={110}
          pad={50}
          r={7}
          font={12}
        />
      </div>
    </div>
  );
}
