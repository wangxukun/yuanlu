"use client";

import React from "react";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

/**
 * 语音评测卡片字幕字号档位（小 / 中 / 大）。
 *
 * 这些 Tailwind class 必须以完整字面量出现在被 tailwind.config content
 * 扫描的文件中（本文件在 ./components 下，会被扫描），否则 JIT 不会生成
 * 对应样式，导致「中」「大」之间无视觉差异。
 *   text-lg md:text-xl lg:text-2xl
 *   text-xl md:text-2xl lg:text-3xl
 *   text-2xl md:text-3xl lg:text-4xl
 */
export const PRACTICE_FONT_SIZE_LEVELS = [
  { className: "text-lg md:text-xl lg:text-2xl" },
  { className: "text-xl md:text-2xl lg:text-3xl" },
  { className: "text-2xl md:text-3xl lg:text-4xl" },
] as const;

/**
 * 语音评测设置面板的原子控件。
 * 视觉风格对齐 FullContentTranscript.tsx 的 SettingsRow / Toggle。
 */

/** 一行设置：左侧图标 + 标签，右侧任意控件 */
export function SettingsRow({
  icon,
  label,
  children,
  onClick,
}: {
  icon?: string;
  label: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-2 rounded-xl",
        onClick &&
          "cursor-pointer hover:bg-ink-50 dark:hover:bg-ink-800/60 transition-colors",
      )}
    >
      <div className="flex items-center gap-2.5 text-sm text-ink-700 dark:text-ink-200">
        {icon && (
          <span className="material-symbols-outlined text-lg text-ink-400 dark:text-ink-500">
            {icon}
          </span>
        )}
        {label}
      </div>
      {children}
    </div>
  );
}

/** 药丸开关 */
export function Toggle({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "relative w-8 h-[18px] rounded-full transition-colors shrink-0",
        checked ? "bg-primary-500" : "bg-ink-200 dark:bg-ink-700",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all",
          checked ? "left-[16px]" : "left-[2px]",
        )}
      />
    </span>
  );
}

/** A- / A+ 风格步进器（可定制 min/max/step 与显示值） */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  displayValue,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** 自定义中间显示文案，默认显示 value */
  displayValue?: string | number;
}) {
  // 将传入值夹到 [min, max]，避免持久化数据超出范围时按钮失灵
  // （例如旧版 maxWords 默认 999，而 Stepper max=50 会导致 + 永远禁用）。
  const effective = Math.max(min, Math.min(max, value));
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(min, effective - step))}
        disabled={effective <= min}
        className="w-7 h-7 rounded-lg text-xs font-bold text-ink-500 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 disabled:opacity-30 transition-colors"
        title="减少"
      >
        -
      </button>
      <span className="w-8 text-center text-xs tabular-nums text-ink-500 dark:text-ink-300">
        {displayValue ?? effective}
      </span>
      <button
        onClick={() => onChange(Math.min(max, effective + step))}
        disabled={effective >= max}
        className="w-7 h-7 rounded-lg text-sm font-bold text-ink-500 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 disabled:opacity-30 transition-colors"
        title="增加"
      >
        +
      </button>
    </div>
  );
}

/** 分段选择器 */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex items-center gap-0.5 bg-ink-100 dark:bg-ink-800 rounded-lg p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all",
            value === opt.value
              ? "bg-white dark:bg-ink-700 text-primary-600 dark:text-primary-400 shadow-sm"
              : "text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-200",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** 分组小标题 */
export function SettingsGroupTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h4 className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-widest text-ink-400 dark:text-ink-500">
      {children}
    </h4>
  );
}

/** 分组分隔线 */
export function SettingsDivider() {
  return <div className="my-1 h-px bg-ink-100 dark:bg-ink-800" />;
}
