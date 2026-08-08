"use client";

import React, { memo, useRef } from "react";
import { PlayCircleIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
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
  return (
    <div
      id={`subtitle-${sub.id}`} // 关键：ID 用于反向查找数据
      data-active={isActive}
      className={clsx(
        "group relative rounded-xl p-2 pl-0 pr-0 sm:p-4 transition-all duration-200 sm:border-l-[3px]",
        isActive
          ? "bg-primary-50 dark:bg-primary-900/20 border-primary-500 shadow-e1"
          : "bg-transparent border-transparent hover:bg-base-200 hover:bg-opacity-30",
      )}
    >
      {/* Proofread icon — desktop only */}
      {onProofread && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onProofread(sub);
          }}
          className="absolute sm:top-2 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200 btn btn-xs btn-ghost text-info-400 hover:text-info-600 hover:bg-info-50 gap-1 hidden sm:flex"
          aria-label="校对字幕"
          title="校对字幕"
        >
          <PencilSquareIcon className="w-4 h-4" />
          <span className="text-[11px]">校对</span>
        </button>
      )}

      {/* Loop button — mobile only */}
      {onToggleLoop && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLoop();
          }}
          className={clsx(
            "absolute bottom-2 right-0 transition-all duration-200 btn btn-xs btn-ghost gap-1 sm:hidden",
            isLooping
              ? "text-primary-600 opacity-100 scale-110"
              : "text-ink-400 opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-primary-50",
          )}
          aria-label="单句循环"
          title="单句循环"
        >
          <span
            className="material-symbols-outlined text-[16px]"
            style={{
              fontVariationSettings: isLooping ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            {isLooping ? "repeat_one" : "repeat"}
          </span>
        </button>
      )}

      <div className="flex gap-2 sm:gap-4 items-start">
        <button
          onClick={() => onJump(sub.start)}
          className={clsx(
            "mt-1.5 flex-shrink-0 transition-all duration-200 transform",
            isActive
              ? "text-primary-600 scale-110 opacity-100"
              : "text-base-content text-opacity-20 opacity-0 group-hover:opacity-100 hover:text-primary hover:scale-110",
          )}
          aria-label="Play segment"
        >
          {isActive && isPlaying ? (
            <div className="relative w-6 h-6 flex items-center justify-center">
              <span className="loading loading-bars loading-xs"></span>
            </div>
          ) : (
            <PlayCircleIcon className="w-7 h-7" />
          )}
        </button>

        <div ref={textRef} className="flex-1 min-w-0">
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
        </div>
      </div>
    </div>
  );
});
