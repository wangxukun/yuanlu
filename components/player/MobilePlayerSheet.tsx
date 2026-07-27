// components/player/MobilePlayerSheet.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { usePlayerStore } from "@/store/player-store";
import { useSession } from "next-auth/react";
import { MergedSubtitleItem } from "@/components/episode/transcript/types";
import InteractiveTranscript from "@/components/episode/InteractiveTranscript";

interface MobilePlayerSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatTime(time: number) {
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function MobilePlayerSheet({
  isOpen,
  onClose,
}: MobilePlayerSheetProps) {
  const { status } = useSession();
  const {
    currentEpisode,
    isPlaying,
    currentTime,
    duration,
    audioRef,
    playbackRate,
    loopMode,
    togglePlay,
    playNext,
    playPrevious,
    setCurrentTime,
    setPlaybackRate,
    toggleLoopMode,
    closePlayer,
  } = usePlayerStore();

  const [subtitles, setSubtitles] = useState<MergedSubtitleItem[]>([]);
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  const displayTime = isDragging ? dragTime : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

  // Load subtitles when sheet opens
  useEffect(() => {
    if (isOpen && currentEpisode?.episodeid) {
      setIsLoadingSubtitles(true);
      fetch(`/api/episode/subtitles?id=${currentEpisode.episodeid}`, {
        cache: "no-store",
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setSubtitles(data.data);
          else setSubtitles([]);
        })
        .catch(() => setSubtitles([]))
        .finally(() => setIsLoadingSubtitles(false));
    }
  }, [isOpen, currentEpisode?.episodeid, status]);

  // Clear subtitles on episode change
  useEffect(() => {
    setSubtitles([]);
  }, [currentEpisode?.episodeid]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  // Swipe down to close
  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.offset.y > 120) onClose();
    },
    [onClose],
  );

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsDragging(true);
    setDragTime(Number(e.target.value));
  };

  const handleSeekEnd = () => {
    if (audioRef) {
      audioRef.currentTime = dragTime;
      setCurrentTime(dragTime);
    }
    setIsDragging(false);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };

  if (!currentEpisode) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-base-100"
        >
          {/* ── Pull handle ── */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-ink-300 dark:bg-ink-600" />
          </div>

          {/* ── Compact Header (Cover, Info, Close) ── */}
          <div className="flex items-center gap-3 px-5 pt-1 pb-4 shrink-0">
            <img
              src={currentEpisode.coverUrl}
              alt={currentEpisode.title}
              className="w-12 h-12 rounded-lg object-cover shadow-sm border border-base-200 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-ink-900 dark:text-ink-50 truncate">
                {currentEpisode.title}
              </h2>
              <p className="text-xs text-primary-600 dark:text-primary-400 font-medium truncate mt-0.5">
                {currentEpisode.podcast?.title || "远路播客"}
              </p>
            </div>
            <div className="flex items-center shrink-0">
              <button
                onClick={onClose}
                className="p-1 text-ink-400 hover:text-ink-600 dark:hover:text-ink-300 transition-colors"
              >
                <span className="material-symbols-outlined text-3xl">
                  expand_more
                </span>
              </button>
              <button
                onClick={() => {
                  closePlayer();
                  onClose();
                }}
                className="p-1 text-ink-300 hover:text-error-500 transition-colors ml-1"
                title="关闭播放器"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
          </div>

          {/* ── Playback Controls & Progress ── */}
          <div className="px-5 shrink-0 pb-5 border-b border-base-200/60 shadow-sm z-10">
            {/* Progress bar */}
            <div className="mb-4">
              <div className="relative h-1 bg-ink-100 dark:bg-ink-800 rounded-full group">
                <div
                  className="absolute left-0 top-0 h-full bg-primary-600 rounded-full transition-all duration-150"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-primary-600 rounded-full shadow-sm" />
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={displayTime}
                  onChange={handleSeekChange}
                  onMouseUp={handleSeekEnd}
                  onTouchEnd={handleSeekEnd}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[11px] text-ink-400 font-mono">
                  {formatTime(displayTime)}
                </span>
                <span className="text-[11px] text-ink-400 font-mono">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between px-1">
              <button
                onClick={cyclePlaybackRate}
                className="text-ink-500 hover:text-primary-600 font-bold text-xs w-9 h-9 flex items-center justify-center rounded-full bg-base-200/50"
              >
                {playbackRate}x
              </button>

              <div className="flex items-center gap-6">
                <button
                  onClick={playPrevious}
                  className="text-ink-700 dark:text-ink-200 active:scale-90 transition-transform"
                >
                  <span className="material-symbols-outlined text-3xl">
                    skip_previous
                  </span>
                </button>
                <button
                  onClick={togglePlay}
                  className="w-14 h-14 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-primary-600/30 active:scale-90 transition-transform"
                >
                  <span
                    className="material-symbols-outlined text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {isPlaying ? "pause" : "play_arrow"}
                  </span>
                </button>
                <button
                  onClick={playNext}
                  className="text-ink-700 dark:text-ink-200 active:scale-90 transition-transform"
                >
                  <span className="material-symbols-outlined text-3xl">
                    skip_next
                  </span>
                </button>
              </div>

              <button
                onClick={toggleLoopMode}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                  loopMode !== "none"
                    ? "text-primary-600 bg-primary-50 dark:bg-primary-900/30"
                    : "text-ink-400"
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {loopMode === "one" ? "repeat_one" : "repeat"}
                </span>
              </button>
            </div>
          </div>

          {/* ── Transcript Section ── */}
          <div className="flex-1 overflow-y-auto bg-ink-50/50 dark:bg-ink-950/20">
            <div className="px-2 pt-3 pb-8">
              {isLoadingSubtitles ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <span className="loading loading-spinner loading-md text-primary-600" />
                  <span className="text-sm text-ink-400">加载字幕中...</span>
                </div>
              ) : subtitles.length > 0 ? (
                <InteractiveTranscript
                  subtitles={subtitles}
                  episode={currentEpisode}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-ink-400">
                  <span className="material-symbols-outlined text-4xl opacity-30">
                    subtitles_off
                  </span>
                  <span className="text-sm">暂无字幕</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
