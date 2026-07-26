// components/player/MobilePlayerBar.tsx
"use client";

import React, { useState } from "react";
import { usePlayerStore } from "@/store/player-store";
import MobilePlayerSheet from "./MobilePlayerSheet";

export default function MobilePlayerBar() {
  const { currentEpisode, isPlaying, currentTime, duration, togglePlay } =
    usePlayerStore();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (!currentEpisode) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Mini Player Bar */}
      <div
        id="mobile-mini-player"
        className="fixed z-[195] md:hidden"
        style={{
          bottom:
            "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))",
          left: 0,
          right: 0,
        }}
      >
        {/* Progress bar - absolute top edge */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-ink-200 dark:bg-ink-800">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div
          className="bg-white/95 dark:bg-ink-900/95 backdrop-blur-2xl border-t border-ink-100 dark:border-ink-800"
          onClick={() => setIsSheetOpen(true)}
        >
          <div className="flex items-center gap-3 px-4 h-[var(--mini-player-height)]">
            {/* Cover thumbnail */}
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-ink-200/50 dark:border-ink-700/50 shadow-sm">
              <img
                src={currentEpisode.coverUrl}
                alt={currentEpisode.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Title & podcast name */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink-800 dark:text-ink-100 truncate">
                {currentEpisode.title}
              </p>
              <p className="text-[11px] text-ink-500 dark:text-ink-400 truncate">
                {currentEpisode.podcast?.title || "远路播客"}
              </p>
            </div>

            {/* Play/Pause button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-600 text-white shadow-lg active:scale-90 transition-transform"
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {isPlaying ? "pause" : "play_arrow"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Full-screen Player Sheet */}
      <MobilePlayerSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
    </>
  );
}
