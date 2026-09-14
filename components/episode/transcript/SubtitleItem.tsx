"use client";

import React, { memo, useCallback, useRef } from "react";
import {
  PencilSquareIcon,
  BookmarkIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import {
  PlayIcon as PlaySolidIcon,
  BookmarkIcon as BookmarkSolidIcon,
} from "@heroicons/react/24/solid";
import clsx from "clsx";
import { ProcessedSubtitle } from "./types";
import { useWordHighlight } from "@/components/transcript/useWordHighlight";

interface SubtitleItemProps {
  sub: ProcessedSubtitle;
  isActive: boolean;
  isPlaying: boolean;
  currentTime: number;
  showTranslation: boolean;
  audioRef?: HTMLAudioElement | null;
  onJump: (time: number) => void;
  onWordClick: (
    word: string,
    contextEn: string,
    contextCn: string,
    timestamp: number,
  ) => void;
  onProofread?: (sub: ProcessedSubtitle) => void;
  isLooping?: boolean;
  onToggleLoop?: () => void;
  /** 句子收藏（句子本）状态，由 InteractiveTranscript 维护（含乐观更新） */
  isSaved?: boolean;
  onToggleSave?: (sub: ProcessedSubtitle) => void;
}

/** mm:ss（分钟补零），与底部时间胶囊样式对齐 */
function formatStartTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export const SubtitleItem = memo(function SubtitleItem({
  sub,
  isActive,
  isPlaying,
  currentTime,
  showTranslation,
  audioRef,
  onJump,
  onWordClick,
  onProofread,
  isLooping,
  onToggleLoop,
  isSaved,
  onToggleSave,
}: SubtitleItemProps) {
  const textRef = useRef<HTMLDivElement>(null);
  // 随语速线性过渡的扫光高亮（与 FullContentTranscript 同款）
  useWordHighlight({
    controller: {
      getTime: () => audioRef?.currentTime ?? -1,
      isPlaying: () => !!audioRef && !audioRef.paused,
    },
    containerRef: textRef,
    isHighlighted: isActive && isPlaying,
    words: sub.words,
    start: sub.start,
    end: sub.end,
  });

  // 沉浸式直点快跳：点击字幕任意文本区域即跳播该句。
  // 存在未收起的文本选区（划词查词中）时不触发，避免与选词冲突；
  // 单词点击与工具栏按钮各自 stopPropagation，走各自的交互。
  const handleCardJump = useCallback(() => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    onJump(sub.start);
  }, [onJump, sub.start]);

  const stopPropagation = useCallback(
    (e: React.MouseEvent) => e.stopPropagation(),
    [],
  );

  const isSentencePlaying = isActive && isPlaying;

  // 扁平无缝排版：字幕行之间零外间距，靠内间距与纤细分割线划分句段；
  // 非播放句完全透明融入页面底色，仅当前句保留高亮底色 + 左侧强调指示条。
  return (
    <div
      id={`subtitle-${sub.id}`} // 关键：ID 用于反向查找数据
      data-active={isActive}
      onClick={handleCardJump}
      className={clsx(
        "group relative cursor-pointer transition-colors duration-200",
        "border-b border-ink-100/80 dark:border-ink-800/60 border-l-4",
        "px-3.5 py-5 sm:px-5 sm:py-6",
        isActive
          ? "bg-primary-50 dark:bg-primary-900/20 border-l-primary-500"
          : "bg-transparent border-l-transparent",
      )}
    >
      {/* 校对字幕 — 悬浮层内接鼠标的宽屏场景 hover 显示 */}
      {onProofread && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onProofread(sub);
          }}
          className="absolute top-2 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200 btn btn-xs btn-ghost text-info-400 hover:text-info-600 hover:bg-info-50 gap-1 hidden sm:flex"
          aria-label="校对字幕"
          title="校对字幕"
        >
          <PencilSquareIcon className="w-4 h-4" />
          <span className="text-[11px]">校对</span>
        </button>
      )}

      <div ref={textRef} className="flex-1 min-w-0 w-full">
        <p
          className={clsx(
            "font-serif text-lg leading-[1.85] tracking-wide transition-colors",
            isActive
              ? "text-primary-600 dark:text-primary-400 font-bold"
              : "text-ink-700 dark:text-ink-200",
          )}
        >
          {sub.words && sub.words.length > 0
            ? sub.words.map((wordObj, i) => {
                const isWordActive =
                  isActive &&
                  isPlaying &&
                  currentTime >= wordObj.start &&
                  currentTime <= wordObj.end;
                return (
                  <span
                    key={i}
                    data-wi={i}
                    onClick={(e) => {
                      const selection = window.getSelection();
                      if (selection && !selection.isCollapsed) return;
                      e.stopPropagation();
                      onWordClick(
                        wordObj.word,
                        sub.textEn,
                        sub.textCn,
                        wordObj.start,
                      );
                    }}
                    className={clsx(
                      "cursor-pointer rounded inline-block active:scale-95 select-text relative transition-colors mr-1",
                      isWordActive
                        ? "bg-accent-100 dark:bg-accent-900/40"
                        : "hover:z-10 hover:bg-accent-100 dark:hover:bg-accent-900/40 hover:text-accent-700 dark:hover:text-accent-300",
                    )}
                  >
                    {wordObj.word}
                  </span>
                );
              })
            : sub.textEn
                .trim()
                .split(/(\s+)/)
                .map((part, i) => {
                  if (part.trim() === "") {
                    return (
                      <span key={i} className="inline select-text">
                        {part}
                      </span>
                    );
                  }
                  return (
                    <span
                      key={i}
                      onClick={(e) => {
                        const selection = window.getSelection();
                        // 移动端兼容：如果正在选中文本，不触发单词点击
                        if (selection && !selection.isCollapsed) {
                          return;
                        }
                        e.stopPropagation();
                        onWordClick(
                          part,
                          sub.textEn,
                          sub.textCn.replace(/\[SPEAKER_\d+\]:\s*/g, ""),
                          sub.start,
                        );
                      }}
                      className="cursor-pointer rounded inline-block active:scale-95 select-text relative hover:z-10 hover:bg-accent-100 dark:hover:bg-accent-900/40 hover:text-accent-700 dark:hover:text-accent-300"
                    >
                      {part}
                    </span>
                  );
                })}
        </p>

        <div
          className={clsx(
            "overflow-hidden transition-all duration-200 ease-in-out",
            showTranslation
              ? "max-h-40 opacity-100 mt-2"
              : "max-h-0 opacity-0 mt-0",
          )}
        >
          <p
            className={clsx(
              "font-sans text-sm leading-[1.7]",
              isActive
                ? "text-ink-600 dark:text-ink-300 font-medium"
                : "text-ink-400",
            )}
          >
            {sub.textCn.replace(/\[SPEAKER_\d+\]:\s*/g, "").trim()}
          </p>
        </div>

        {/* ── 底部扁平微型控制工具条（时间跳转 / 收藏 / 单句循环）── */}
        <div
          onClick={stopPropagation}
          className="mt-3 flex items-center justify-between"
        >
          {/* 左：时间跳转胶囊 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onJump(sub.start);
            }}
            className={clsx(
              "flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium tabular-nums transition-colors active:scale-95",
              isSentencePlaying
                ? "bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300"
                : "bg-ink-100/70 dark:bg-ink-800/60 text-ink-500 dark:text-ink-300",
            )}
            aria-label={`播放此句（${formatStartTime(sub.start)}）`}
          >
            {isSentencePlaying ? (
              <SpeakerWaveIcon className="w-3.5 h-3.5" aria-hidden />
            ) : (
              <PlaySolidIcon className="w-3 h-3" aria-hidden />
            )}
            <span>{formatStartTime(sub.start)}</span>
          </button>

          {/* 右：功能操作组 */}
          <div className="flex items-center gap-1.5">
            {onToggleSave && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(sub);
                }}
                className={clsx(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all active:scale-95",
                  isSaved
                    ? "bg-accent-50 dark:bg-accent-900/30 text-accent-600 dark:text-accent-300"
                    : "text-ink-400 dark:text-ink-500",
                )}
                aria-label={isSaved ? "取消收藏该句" : "收藏该句到句子本"}
                aria-pressed={isSaved}
              >
                {isSaved ? (
                  <BookmarkSolidIcon className="w-3.5 h-3.5" aria-hidden />
                ) : (
                  <BookmarkIcon className="w-3.5 h-3.5" aria-hidden />
                )}
                <span>{isSaved ? "已收藏" : "收藏"}</span>
              </button>
            )}

            {onToggleLoop && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLoop();
                }}
                className={clsx(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all active:scale-95",
                  isLooping
                    ? "animate-pulse bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300"
                    : "text-ink-400 dark:text-ink-500",
                )}
                aria-label={isLooping ? "取消单句循环" : "开启单句循环"}
                aria-pressed={isLooping}
              >
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{
                    fontVariationSettings: isLooping ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {isLooping ? "repeat_one" : "repeat"}
                </span>
                <span>{isLooping ? "循环中" : "循环"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
