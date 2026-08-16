"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Gauge, Sparkles, Info } from "lucide-react";
import type {
  SpeechProfileDto,
  SpeechProfileRadarPoint,
} from "@/core/speech-profile/dto";

/**
 * 发音能力画像卡：五维雷达 + CEFR 等级（VOICE-EVALUATION 阶段四·任务3）。
 * 数据由服务端从用户全部语音评测聚合而来，对所有用户免费展示。
 */
export function SpeechProfileCard({
  profile,
  radar,
}: {
  profile: SpeechProfileDto;
  radar: SpeechProfileRadarPoint[];
}) {
  const hasData = profile.evalCount > 0;
  const avgSpeedText =
    profile.avgSpeed !== null ? `${Math.round(profile.avgSpeed)} 词/分` : "—";

  return (
    <div className="bg-white dark:bg-ink-900 rounded-2xl p-6 border border-base-200/60 dark:border-ink-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
            <Gauge size={20} />
          </div>
          <h2 className="text-lg font-bold text-base-content">发音能力画像</h2>
        </div>
        {profile.cefrLevel && (
          <span className="badge badge-secondary gap-1 font-bold px-4 py-3">
            <Sparkles size={14} />
            {profile.cefrLevel} 级
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        <div className="h-64">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="dim"
                  tick={{
                    fill: "#6b7280",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [`${value}分`, "得分"]}
                />
                <Radar
                  name="能力得分"
                  dataKey="score"
                  stroke="#7c3aed"
                  fill="#7c3aed"
                  fillOpacity={0.2}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center bg-base-100 dark:bg-ink-950 rounded-2xl">
              <Gauge className="w-12 h-12 text-base-content/20 mb-3" />
              <p className="text-base-content/60 font-medium">暂无画像数据</p>
              <p className="text-xs text-base-content/40 mt-1">
                完成语音评测后自动生成你的能力雷达
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-base-100 dark:bg-ink-950 rounded-xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-base-content/40">
                评测次数
              </div>
              <div className="text-lg font-bold text-base-content">
                {profile.evalCount}
              </div>
            </div>
            <div className="bg-base-100 dark:bg-ink-950 rounded-xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-base-content/40">
                综合均分
              </div>
              <div className="text-lg font-bold text-base-content">
                {profile.avgOverall !== null
                  ? Math.round(profile.avgOverall)
                  : "—"}
              </div>
            </div>
            <div className="bg-base-100 dark:bg-ink-950 rounded-xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-base-content/40">
                平均语速
              </div>
              <div className="text-lg font-bold text-base-content">
                {avgSpeedText}
              </div>
            </div>
          </div>

          {profile.cefrLevel && (
            <div className="flex items-start gap-2 text-xs text-base-content/60 bg-secondary/5 border border-secondary/20 rounded-xl p-3">
              <Info size={14} className="mt-0.5 shrink-0 text-secondary" />
              <p>
                根据你的评测表现，当前发音水平约为{" "}
                <span className="font-bold text-base-content">
                  CEFR {profile.cefrLevel}
                </span>{" "}
                级，首页&quot;为你推荐&quot;已按该等级匹配剧集难度。评测越多，画像越准。
              </p>
            </div>
          )}
          {!hasData && (
            <div className="flex items-start gap-2 text-xs text-base-content/60 bg-base-100 dark:bg-ink-950 rounded-xl p-3">
              <Info size={14} className="mt-0.5 shrink-0" />
              <p>
                在任意剧集的跟读练习中完成语音评测，即可生成专属画像并获得难度匹配推荐。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
