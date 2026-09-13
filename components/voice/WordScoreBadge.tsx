"use client";

import React from "react";

/**
 * 逐词纠错详情 · 带得分的单词胶囊（三个评测页面共用）：
 * AI 影子跟读评测 / 语音评测 / 发音闯关复习均经由 SpeechEvaluationCard 渲染。
 *
 * 结构：单词文本（text-base 级）+ 右侧内联小号得分（继承档位前景色）。
 * 按得分分档着色：高分绿 / 中档琥珀 / 低分红（红色波浪下划线）；
 * 得分 < 85 的词传 onClick 后可点击（供展开音素诊断），并带悬浮微交互。
 */

export interface WordScoreBadgeProps {
  word: string;
  score: number;
  /** 点击回调（通常仅在 score < 85 时传入，展开该词的音素诊断） */
  onClick?: () => void;
  className?: string;
}

export const getWordScoreTierClass = (score: number) => {
  if (score >= 85)
    return "bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800 font-medium";
  if (score >= 60)
    return "bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300 border-accent-300 dark:border-accent-800 font-semibold";
  return "bg-error-50 dark:bg-error-950/40 text-error-600 dark:text-error-400 border-error-300 dark:border-error-800 underline decoration-error-500 decoration-wavy underline-offset-4 font-semibold";
};

export default function WordScoreBadge({
  word,
  score,
  onClick,
  className = "",
}: WordScoreBadgeProps) {
  const clickable = score < 85 && !!onClick;

  return (
    <span
      onClick={
        clickable
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
      className={`px-3 py-1.5 rounded-full border transition-all inline-flex items-baseline gap-1 ${getWordScoreTierClass(score)} ${
        clickable ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : ""
      } ${className}`}
    >
      {word}
      <span className="text-[10px] font-bold font-mono tabular-nums opacity-75">
        {Math.round(score)}
      </span>
    </span>
  );
}
