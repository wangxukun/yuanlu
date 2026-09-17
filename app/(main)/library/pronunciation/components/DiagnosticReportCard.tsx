"use client";

import React, { useState } from "react";
import {
  Stethoscope,
  Lock,
  TrendingUp,
  Loader2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import { useUIStore } from "@/store/ui-store";
import { toast } from "sonner";
import { getPhonemeTip } from "@/core/speech/phoneme-tips";

interface PhonemeStat {
  phoneme: string;
  avgScore: number;
  count: number;
  lowScoreCount: number;
}

interface DiagnosticReportCardProps {
  /** 音素统计（均分升序 = 最弱在前，与弱项本雷达同源 SSR 下发） */
  stats: PhonemeStat[];
  isPremium: boolean;
}

interface TrendPoint {
  month: string;
  avgScore: number;
  count: number;
}

/** 免费层可见的音素数量（其后模糊锁定——"看得到数据但看不到深度分析"） */
const FREE_VISIBLE_PHONEMES = 3;
const TOP_N = 10;

/**
 * [P3-e] AI 发音诊断报告卡（激活休眠墙）：
 * - 免费层：五维雷达在上方 SpeechProfileCard（现状已有）；本卡展示薄弱音素
 *   Top3 实分 + 其余模糊锁定，点击解锁 → PremiumModal（source diagnostic_report，
 *   openPremiumModal 内置埋点——验收红线）
 * - PRO 层：薄弱音素 Top10 + 逐个专项练习建议（phoneme-tips 静态映射，零 LLM 成本）
 *   + 近 6 个月进步曲线（懒加载 /api/speech/diagnostic）
 */
export function DiagnosticReportCard({
  stats,
  isPremium,
}: DiagnosticReportCardProps) {
  const topPhonemes = stats.slice(0, TOP_N);
  const lockedCount = Math.max(0, topPhonemes.length - FREE_VISIBLE_PHONEMES);
  const [showTrend, setShowTrend] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trend, setTrend] = useState<TrendPoint[] | null>(null);

  const openDiagnosticModal = () =>
    useUIStore.getState().openPremiumModal("diagnostic_report");

  const loadTrend = async () => {
    const next = !showTrend;
    setShowTrend(next);
    if (!next || trend || trendLoading) return;
    setTrendLoading(true);
    try {
      const res = await fetch("/api/speech/diagnostic");
      if (res.status === 403) {
        // 兜底承接：会员态过期/竞态下触墙，同样走弹窗（红线双保险）
        openDiagnosticModal();
        setShowTrend(false);
        return;
      }
      const json = await res.json();
      if (json.success && json.data?.trend) {
        setTrend(json.data.trend as TrendPoint[]);
      } else {
        toast.error("诊断数据加载失败，请稍后重试");
      }
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setTrendLoading(false);
    }
  };

  const scoreColor = (score: number) =>
    score >= 80 ? "bg-success" : score >= 60 ? "bg-amber-500" : "bg-error-500";

  return (
    <div className="bg-white dark:bg-ink-900 rounded-2xl p-6 border border-base-200/60 dark:border-ink-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary-600/10 dark:bg-primary-400/10 rounded-lg text-primary-600 dark:text-primary-400">
            <Stethoscope size={20} />
          </div>
          <h2 className="text-lg font-bold text-base-content">
            AI 发音诊断报告
          </h2>
        </div>
        {!isPremium && (
          <span className="badge badge-sm border-none font-bold text-white bg-amber-500 gap-1">
            <Lock size={11} /> PRO
          </span>
        )}
      </div>

      {topPhonemes.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center bg-base-100 dark:bg-ink-950 rounded-2xl py-10">
          <Stethoscope className="w-10 h-10 text-base-content/20 mb-3" />
          <p className="text-base-content/60 font-medium">诊断数据积累中</p>
          <p className="text-xs text-base-content/40 mt-1">
            完成更多语音评测后，这里会逐个指出你的薄弱音素
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {topPhonemes.map((ph, idx) => {
            const visible = isPremium || idx < FREE_VISIBLE_PHONEMES;
            const tip = getPhonemeTip(ph.phoneme);
            return (
              <div
                key={ph.phoneme}
                className={`rounded-xl border p-3.5 transition-all ${
                  visible
                    ? "border-base-200/80 dark:border-ink-800 bg-base-50/30 dark:bg-ink-950/30"
                    : // 模糊锁定态：结构可见、内容不可读（看得到数据但看不到深度分析）
                      "border-dashed border-base-300/60 dark:border-ink-700 bg-base-100 dark:bg-ink-950 relative select-none"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono font-black text-lg w-14 shrink-0 ${
                      visible
                        ? ph.avgScore < 60
                          ? "text-error-600 dark:text-error-400"
                          : "text-amber-600 dark:text-amber-400"
                        : "text-transparent blur-[6px]"
                    }`}
                  >
                    /{ph.phoneme}/
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-base-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreColor(ph.avgScore)}`}
                          style={{
                            width: visible
                              ? `${ph.avgScore}%`
                              : `${ph.avgScore * 0.4}%`,
                            filter: visible ? undefined : "blur(3px)",
                          }}
                        />
                      </div>
                      <span
                        className={`text-xs font-black w-9 text-right ${
                          visible ? "" : "text-transparent blur-[5px]"
                        }`}
                      >
                        {ph.avgScore}分
                      </span>
                    </div>
                    <p
                      className={`text-[11px] text-base-content/40 mt-1 font-medium ${
                        visible ? "" : "text-transparent blur-[4px]"
                      }`}
                    >
                      评测 {ph.count} 次 · 低分 {ph.lowScoreCount} 次
                    </p>
                  </div>
                  {!visible && (
                    <Lock size={14} className="text-base-content/30 shrink-0" />
                  )}
                </div>
                {visible && (
                  <div className="mt-2.5 flex items-start gap-2 text-[11px] leading-relaxed bg-amber-50/70 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/20 rounded-lg px-2.5 py-2">
                    <Lightbulb
                      size={12}
                      className="text-amber-500 mt-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-base-content/80">{tip.tip}</p>
                      <p className="text-base-content/50 mt-0.5 font-mono">
                        对比练习：{tip.contrast}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* 免费层：模糊区解锁引导 */}
          {!isPremium && (
            <button
              type="button"
              onClick={openDiagnosticModal}
              className="w-full rounded-2xl border border-dashed border-amber-400/60 dark:border-amber-500/40 bg-amber-50/60 dark:bg-amber-500/5 hover:bg-amber-50 dark:hover:bg-amber-500/10 px-4 py-3.5 flex items-center gap-3 transition-colors cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                <Lock size={16} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-bold text-base-content">
                  还有 {lockedCount} 个薄弱音素的专项建议已锁定
                </p>
                <p className="text-[11px] text-base-content/60 mt-0.5">
                  PRO 解锁：Top10 逐个击破方案 + 逐月进步曲线
                </p>
              </div>
              <span className="btn btn-sm rounded-full border-0 bg-amber-500 hover:bg-amber-600 text-white shrink-0">
                解锁完整诊断
              </span>
            </button>
          )}

          {/* PRO 层：进步曲线（懒加载） */}
          {isPremium && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => void loadTrend()}
                className="flex items-center gap-2 text-sm font-bold text-primary-600 dark:text-primary-400 hover:underline"
              >
                {showTrend ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
                <TrendingUp size={16} />近 6 个月进步曲线
              </button>
              {showTrend && (
                <div className="mt-3 h-52">
                  {trendLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                    </div>
                  ) : trend && trend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trend}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="currentColor"
                          opacity={0.1}
                        />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 11 }}
                          width={28}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: "none",
                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                          }}
                          formatter={(value: number) => [
                            `${value}分`,
                            "月均综合分",
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="avgScore"
                          stroke="#4f46e5"
                          strokeWidth={2.5}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-base-content/40">
                      近 6 个月暂无带综合分的评测记录
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
