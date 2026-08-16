"use client";

import React from "react";
import {
  TrendingUp,
  MousePointerClick,
  ShieldAlert,
  Lock,
  Crown,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import type { ConversionStats } from "@/lib/actions/conversion-actions";
import Link from "next/link";

const EVENT_LABELS: Record<string, string> = {
  TRIAL_REACHED: "练习触墙",
  PREMIUM_MODAL_OPEN: "弹窗打开",
  QUOTA_BLOCKED: "配额拦截",
};

const SOURCE_LABELS: Record<string, string> = {
  speech_practice: "语音练习试用（前5句）",
  trial_unlock: "试用解锁横幅",
  trial_complete: "体验结束解锁 CTA",
  speech_quota: "评测配额用尽",
  speech_evaluation: "评测配额拦截（调用）",
  speech_save: "评测配额拦截（保存）",
  vocabulary_total: "生词本总量已满",
  vocabulary_daily: "生词每日上限",
  dictionary_daily: "词典每日查询上限",
  dictionary_quota: "词典配额弹窗",
  pronunciation_locked: "弱项本锁定提示",
  pronunciation_trial: "弱项本试用（前3条）",
  episode_audio_download: "音频下载",
  episode_practice: "剧集练习",
  exclusive_play: "专享播放（已停用）",
  unknown: "未标注来源",
};

const EVENT_COLORS: Record<string, string> = {
  TRIAL_REACHED: "#f59e0b",
  PREMIUM_MODAL_OPEN: "#8b5cf6",
  QUOTA_BLOCKED: "#ef4444",
};

export default function ConversionClient({
  stats,
}: {
  stats: ConversionStats;
}) {
  const summaryOf = (type: string) =>
    stats.summary.find((s) => s.eventType === type);

  const trial = summaryOf("TRIAL_REACHED");
  const modal = summaryOf("PREMIUM_MODAL_OPEN");
  const quota = summaryOf("QUOTA_BLOCKED");

  // 漏斗：触墙（试用 + 配额）→ 弹窗 → 新订阅
  const modalToSub =
    modal && modal.users > 0
      ? ((stats.newSubscriptions / modal.users) * 100).toFixed(1)
      : "—";

  const cards = [
    {
      label: "练习触墙",
      sub: "免费用户首次进入受限练习",
      times: trial?.times ?? 0,
      users: trial?.users ?? 0,
      icon: <Lock size={24} />,
      iconBg: "bg-amber-500/10 text-amber-500",
    },
    {
      label: "配额拦截",
      sub: "生词/评测免费额度用尽",
      times: quota?.times ?? 0,
      users: quota?.users ?? 0,
      icon: <ShieldAlert size={24} />,
      iconBg: "bg-red-500/10 text-red-500",
    },
    {
      label: "会员弹窗打开",
      sub: "用户看到升级引导",
      times: modal?.times ?? 0,
      users: modal?.users ?? 0,
      icon: <MousePointerClick size={24} />,
      iconBg: "bg-violet-500/10 text-violet-500",
    },
    {
      label: "新增订阅",
      sub: "周期内新开通会员",
      times: stats.newSubscriptions,
      users: stats.newSubscriptions,
      icon: <Crown size={24} />,
      iconBg: "bg-emerald-500/10 text-emerald-500",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-base-content tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary text-primary-content rounded-xl">
              <TrendingUp size={24} />
            </div>
            转化分析
          </h1>
          <p className="text-base-content/60 mt-1 italic">
            会员转化漏斗：触墙 → 弹窗引导 → 订阅
          </p>
        </div>
        <div className="join shadow-sm">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/admin/conversion?days=${d}`}
              className={`join-item btn btn-sm rounded-xl font-bold ${
                stats.days === d
                  ? "btn-primary"
                  : "btn-ghost bg-base-100 border-base-300"
              }`}
            >
              近 {d} 天
            </Link>
          ))}
        </div>
      </div>

      {/* 指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div
            key={card.label}
            className="card bg-base-100 shadow-sm border border-base-200"
          >
            <div className="card-body flex-row items-center justify-between p-6">
              <div className="min-w-0">
                <p className="text-xs font-bold opacity-50 uppercase tracking-widest">
                  {card.label}
                </p>
                <p className="text-3xl font-black mt-1">{card.times}</p>
                <p className="text-xs opacity-50 mt-1">
                  {card.users} 个独立用户 · {card.sub}
                </p>
              </div>
              <div className={`p-4 rounded-2xl shrink-0 ${card.iconBg}`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 漏斗转化链 */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body p-6">
          <h2 className="card-title text-base font-black">
            转化链路（近 {stats.days} 天）
          </h2>
          <div className="flex flex-col md:flex-row items-stretch gap-4 mt-2">
            {[
              {
                label: "看到付费墙",
                value: (trial?.users ?? 0) + (quota?.users ?? 0),
                note: "触墙用户（含重复）",
              },
              {
                label: "打开会员弹窗",
                value: modal?.users ?? 0,
                note: `引导率 ${modal && (trial || quota) ? (((modal.users || 0) / Math.max(1, (trial?.users ?? 0) + (quota?.users ?? 0))) * 100).toFixed(1) : "—"}%`,
              },
              {
                label: "新开订阅",
                value: stats.newSubscriptions,
                note: `弹窗→订阅 ${modalToSub}%`,
              },
            ].map((step, i, arr) => (
              <React.Fragment key={step.label}>
                <div className="flex-1 rounded-2xl border border-base-200 bg-base-200/30 p-5 text-center">
                  <p className="text-xs font-bold opacity-50 uppercase tracking-widest">
                    {step.label}
                  </p>
                  <p className="text-2xl font-black mt-1">{step.value}</p>
                  <p className="text-[11px] opacity-50 mt-1">{step.note}</p>
                </div>
                {i < arr.length - 1 && (
                  <div className="hidden md:flex items-center opacity-30">
                    <ArrowRight size={20} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="text-xs opacity-40 mt-2">
            注：触墙用户数为试用触墙与配额拦截独立用户之和（个别用户可能同时命中两类，为近似上界）
          </p>
        </div>
      </div>

      {/* 趋势图 */}
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body p-6">
          <h2 className="card-title text-base font-black">每日事件趋势</h2>
          <div className="h-72 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.trend} barGap={2}>
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
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(128,128,128,0.2)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="TRIAL_REACHED"
                  name={EVENT_LABELS.TRIAL_REACHED}
                  fill={EVENT_COLORS.TRIAL_REACHED}
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="PREMIUM_MODAL_OPEN"
                  name={EVENT_LABELS.PREMIUM_MODAL_OPEN}
                  fill={EVENT_COLORS.PREMIUM_MODAL_OPEN}
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="QUOTA_BLOCKED"
                  name={EVENT_LABELS.QUOTA_BLOCKED}
                  fill={EVENT_COLORS.QUOTA_BLOCKED}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* 来源分布 */}
        <div className="card bg-base-100 border border-base-200 shadow-sm xl:col-span-2">
          <div className="card-body p-6">
            <h2 className="card-title text-base font-black">触发来源分布</h2>
            <div className="overflow-x-auto mt-2">
              <table className="table table-sm">
                <thead>
                  <tr className="text-[11px] font-bold opacity-50 uppercase tracking-widest">
                    <th>事件 / 来源</th>
                    <th className="text-right">次数</th>
                    <th className="text-right">用户</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.sources.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center opacity-50 py-8">
                        周期内暂无事件
                      </td>
                    </tr>
                  )}
                  {stats.sources.map((row) => (
                    <tr
                      key={`${row.eventType}-${row.source}`}
                      className="hover:bg-base-200/30"
                    >
                      <td>
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-2"
                          style={{
                            background: EVENT_COLORS[row.eventType] ?? "#999",
                          }}
                        />
                        <span className="font-bold text-xs">
                          {EVENT_LABELS[row.eventType] ?? row.eventType}
                        </span>
                        <span className="opacity-50 text-xs ml-2">
                          {SOURCE_LABELS[row.source] ?? row.source}
                        </span>
                      </td>
                      <td className="text-right font-black">{row.times}</td>
                      <td className="text-right opacity-70">{row.users}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 最近事件 */}
        <div className="card bg-base-100 border border-base-200 shadow-sm xl:col-span-3">
          <div className="card-body p-6">
            <h2 className="card-title text-base font-black">最近 50 条事件</h2>
            <div className="overflow-x-auto mt-2">
              <table className="table table-sm">
                <thead>
                  <tr className="text-[11px] font-bold opacity-50 uppercase tracking-widest">
                    <th>时间</th>
                    <th>用户</th>
                    <th>事件</th>
                    <th>来源</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center opacity-50 py-8">
                        暂无事件
                      </td>
                    </tr>
                  )}
                  {stats.recent.map((ev) => (
                    <tr key={ev.id} className="hover:bg-base-200/30">
                      <td className="font-mono text-[11px] opacity-70 whitespace-nowrap">
                        {format(new Date(ev.createdAt), "MM-dd HH:mm")}
                      </td>
                      <td className="text-xs">
                        {ev.nickname ??
                          ev.email?.split("@")[0] ??
                          (ev.userid ? (
                            <span className="opacity-40">
                              {ev.userid.slice(0, 8)}…
                            </span>
                          ) : (
                            <span className="opacity-40 italic">未登录</span>
                          ))}
                      </td>
                      <td>
                        <span
                          className="badge badge-sm border-none font-bold text-white"
                          style={{
                            background: EVENT_COLORS[ev.eventType] ?? "#999",
                          }}
                        >
                          {EVENT_LABELS[ev.eventType] ?? ev.eventType}
                        </span>
                      </td>
                      <td className="text-xs opacity-60">
                        {SOURCE_LABELS[ev.source ?? "unknown"] ?? ev.source}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
