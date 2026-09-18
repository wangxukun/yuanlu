"use client";

import { Infinity as InfinityIcon } from "lucide-react";
import { shouldPreviewSentenceQuota } from "@/lib/quota";

/* ── 配额条统一三态梯度：句子本/生词本等配额卡共享的单一数据源 ──
   Safe <80%（主题绿·远青）/ Warning ≥80% 未满（琥珀）/ Full 已满或耗尽（红），
   阈值与 80% 预告（shouldPreviewSentenceQuota）同一条规则，不另立口径 */
export function getStatusBarColor(used: number, total: number) {
  if (total > 0 && used >= total)
    return { bar: "bg-red-500", text: "text-red-500 dark:text-red-400" };
  if (shouldPreviewSentenceQuota(used, total))
    return {
      bar: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
    };
  return {
    bar: "bg-primary-600 dark:bg-primary-400",
    text: "text-base-content/50",
  };
}

/**
 * 配额进度栏：标题左 / 状态文本右（flex justify-between）+ "已用量"进度条。
 * 布局、轨道底色/高度/圆角、颜色梯度全部内聚于此——各栏传入各自
 * used/total 即获得完全一致的视觉与状态反馈。
 */
export function QuotaStatusBar({
  className = "",
  label,
  statusText,
  used,
  total,
}: {
  className?: string;
  label: string;
  statusText: string;
  used: number;
  total: number;
}) {
  const { bar, text } = getStatusBarColor(used, total);
  const percentage = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div className={`flex-1 min-w-0 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold text-base-content">{label}</span>
        <span className={`text-[11px] font-black ${text}`}>{statusText}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={total}
        className="w-full bg-base-200 h-2 rounded-full overflow-hidden mt-2"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export interface QuotaColumnProps {
  /** 栏标题（如"句子本容量" / "今日复习评测"） */
  label: string;
  /** 右侧状态文本（如"25/30 · 还能收藏 5 句"），由调用方按各自口径拼装 */
  statusText: string;
  /** 已用量（进度条填充与颜色梯度均以此为分子） */
  used: number;
  /** 总额度 */
  total: number;
}

/**
 * 配额双栏状态卡（[P3-d] 配额倒计时可视化，句子本/生词本共用）：
 * 外层卡片容器（白底/圆角/阴影）+ PRO 无限态 / 免费双栏态。
 * 传入两栏的 label/statusText/used/total，即可获得两页完全一致的
 * 布局、轨道样式与三态颜色梯度。
 */
export function QuotaStatusCard({
  isPremium,
  premiumTitle,
  premiumSubtitle,
  columns,
}: {
  isPremium: boolean;
  /** PRO 态主文案，如"PRO 无限收藏 · 已收 12 句" */
  premiumTitle: string;
  /** PRO 态副文案，如"容量不设限，复习评测也不限次" */
  premiumSubtitle: string;
  /** 恰好两栏：左为主栏，右栏带分隔线 */
  columns: [QuotaColumnProps, QuotaColumnProps];
}) {
  const [left, right] = columns;
  return (
    <div className="bg-white dark:bg-ink-900 rounded-3xl px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-8">
      {isPremium ? (
        <div className="flex items-center gap-2.5 flex-1">
          <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
            <InfinityIcon size={16} />
          </span>
          <div className="text-xs">
            <p className="font-bold text-base-content">{premiumTitle}</p>
            <p className="text-base-content/50 mt-0.5">{premiumSubtitle}</p>
          </div>
        </div>
      ) : (
        <>
          <QuotaStatusBar {...left} />
          <QuotaStatusBar
            className="sm:border-l sm:border-base-200 sm:pl-6"
            {...right}
          />
        </>
      )}
    </div>
  );
}
