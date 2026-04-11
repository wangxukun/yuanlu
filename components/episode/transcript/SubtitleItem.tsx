"use client";

import React, { memo } from "react";
import { PlayCircleIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { ProcessedSubtitle } from "./types";

interface SubtitleItemProps {
  sub: ProcessedSubtitle;
  isActive: boolean;
  isPlaying: boolean;
  showTranslation: boolean;
  isLoggedIn: boolean;
  onJump: (time: number) => void;
  onWordClick: (word: string, contextEn: string, contextZh: string) => void;
  onProofread?: (sub: ProcessedSubtitle) => void;
}

export const SubtitleItem = memo(function SubtitleItem({
  sub,
  isActive,
  isPlaying,
  showTranslation,
  isLoggedIn,
  onJump,
  onWordClick,
  onProofread,
}: SubtitleItemProps) {
  return (
    <div
      id={`subtitle-${sub.id}`} // 关键：ID 用于反向查找数据
      data-active={isActive}
      className={clsx(
        "group relative rounded-xl p-4 sm:p-6 transition-all duration-200 border-l-4",
        isActive
          ? "bg-orange-50 bg-opacity-80 border-orange-400 shadow-sm"
          : "bg-transparent border-transparent hover:bg-base-200 hover:bg-opacity-30",
      )}
    >
      {/* Proofread icon — appears on hover in top-right corner */}
      {isLoggedIn && onProofread && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onProofread(sub);
          }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 btn btn-xs btn-ghost text-violet-400 hover:text-violet-600 hover:bg-violet-50 gap-1"
          aria-label="校对字幕"
          title="校对字幕"
        >
          <PencilSquareIcon className="w-4 h-4" />
          <span className="hidden sm:inline text-[11px]">校对</span>
        </button>
      )}

      <div className="flex gap-4 sm:gap-6 items-start">
        <button
          onClick={() => onJump(sub.start)}
          className={clsx(
            "mt-1.5 flex-shrink-0 transition-all duration-200 transform",
            isActive
              ? "text-orange-500 scale-110 opacity-100"
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

        <div className="flex-1 min-w-0">
          <p
            className={clsx(
              "font-serif text-lg sm:text-xl leading-8 sm:leading-9 tracking-wide transition-colors",
              isActive ? "text-slate-900 font-medium" : "text-slate-700",
            )}
          >
            {sub.textEn
              .trim()
              .split(" ")
              .map((word, i) => (
                <React.Fragment key={i}>
                  <span
                    onClick={(e) => {
                      const selection = window.getSelection();
                      // 移动端兼容：如果正在选中文本，不触发单词点击
                      if (selection && !selection.isCollapsed) {
                        return;
                      }
                      e.stopPropagation();
                      onWordClick(word, sub.textEn, sub.textZh);
                    }}
                    className="cursor-pointer rounded transition-colors px-0.5 -mx-0.5 inline-block active:scale-95 select-text relative hover:z-10 hover:bg-orange-200 hover:text-orange-700"
                  >
                    {word}
                  </span>{" "}
                </React.Fragment>
              ))}
          </p>

          <div
            className={clsx(
              "overflow-hidden transition-all duration-200 ease-in-out",
              showTranslation
                ? "max-h-40 opacity-100 mt-3"
                : "max-h-0 opacity-0 mt-0",
            )}
          >
            <p
              className={clsx(
                "font-sans text-sm sm:text-base leading-7 tracking-wider",
                isActive ? "text-slate-600 font-medium" : "text-slate-400",
              )}
            >
              {sub.textZh.trim()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});
