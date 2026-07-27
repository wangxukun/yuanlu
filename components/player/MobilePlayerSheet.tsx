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

          {/* ── Close button ── */}
          <div className="flex items-center justify-between px-4 pb-2 shrink-0">
            <button
              onClick={onClose}
              className="p-1 text-ink-400 hover:text-ink-600 dark:hover:text-ink-300 transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">
                expand_more
              </span>
            </button>
            <span className="text-xs font-bold text-ink-400 dark:text-ink-500 uppercase tracking-widest">
              正在播放
            </span>
            <button
              onClick={() => {
                closePlayer();
                onClose();
              }}
              className="p-1 text-ink-400 hover:text-error-500 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* ── Cover & Info ── */}
          <div className="px-8 pt-2 pb-4 shrink-0">
            {/* Large cover */}
            <div className="relative aspect-square max-w-[280px] mx-auto rounded-xl overflow-hidden shadow-e3 border border-base-200">
              <img
                src={currentEpisode.coverUrl}
                alt={currentEpisode.title}
                className="w-full h-full object-cover"
              />
              {/* Ambient glow behind cover */}
              <div
                className="absolute -inset-4 -z-10 blur-3xl opacity-20"
                style={{
                  backgroundImage: `url(${currentEpisode.coverUrl})`,
                  backgroundSize: "cover",
                }}
              />
            </div>

            {/* Title & podcast */}
            <div className="mt-5 text-center">
              <h2 className="text-lg font-bold text-ink-900 dark:text-ink-50 line-clamp-2 leading-tight">
                {currentEpisode.title}
              </h2>
              <p className="text-sm text-primary-600 dark:text-primary-400 font-medium mt-1">
                {currentEpisode.podcast?.title || "远路播客"}
              </p>
            </div>
          </div>

          {/* ── Progress bar ── */}
          <div className="px-6 shrink-0">
            <div className="relative h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full group">
              <div
                className="absolute left-0 top-0 h-full bg-primary-600 rounded-full transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-primary-600 rounded-full shadow-md" />
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
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-ink-400 font-mono">
                {formatTime(displayTime)}
              </span>
              <span className="text-[11px] text-ink-400 font-mono">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* ── Playback Controls ── */}
          <div className="flex items-center justify-center gap-6 py-4 shrink-0">
            {/* Speed */}
            <button
              onClick={cyclePlaybackRate}
              className="text-ink-400 hover:text-primary-600 font-bold text-xs w-10 h-10 flex items-center justify-center rounded-full bg-ink-50 dark:bg-ink-800 transition-colors"
            >
              {playbackRate}x
            </button>

            {/* Previous */}
            <button
              onClick={playPrevious}
              className="text-ink-600 dark:text-ink-300 active:scale-90 transition-transform"
            >
              <span className="material-symbols-outlined text-3xl">
                skip_previous
              </span>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-primary-600/30 active:scale-90 transition-transform"
            >
              <span
                className="material-symbols-outlined text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {isPlaying ? "pause" : "play_arrow"}
              </span>
            </button>

            {/* Next */}
            <button
              onClick={playNext}
              className="text-ink-600 dark:text-ink-300 active:scale-90 transition-transform"
            >
              <span className="material-symbols-outlined text-3xl">
                skip_next
              </span>
            </button>

            {/* Loop mode */}
            <button
              onClick={toggleLoopMode}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                loopMode !== "none"
                  ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30"
                  : "text-ink-400 bg-ink-50 dark:bg-ink-800"
              }`}
            >
              <span className="material-symbols-outlined text-xl">
                {loopMode === "one" ? "repeat_one" : "repeat"}
              </span>
            </button>
          </div>

          {/* ── Transcript Section ── */}
          <div className="flex-1 overflow-y-auto border-t border-base-200">
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
