// components/player/MobilePlayerSheet.tsx
"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePlayerStore } from "@/store/player-store";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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

  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [transcriptMode, setTranscriptMode] = useState<"read" | "dictate">(
    "read",
  );
  const [autoScroll, setAutoScroll] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);

  if (!currentEpisode) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-base-100 dark:bg-ink-950"
        >
          {/* ── Slim Header ── */}
          <header className="flex items-center justify-between h-14 px-4 border-b border-base-200 dark:border-ink-800 bg-base-100/90 dark:bg-ink-900/90 backdrop-blur z-20 shrink-0 shadow-sm">
            <button
              onClick={onClose}
              className="p-2 -ml-2 text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">
                expand_more
              </span>
            </button>
            <div className="flex bg-base-200 dark:bg-ink-800 rounded-lg p-1">
              <button
                onClick={() => setTranscriptMode("read")}
                className={`px-4 py-1 text-xs font-semibold rounded-md transition-colors ${
                  transcriptMode === "read"
                    ? "bg-base-100 dark:bg-ink-700 text-primary-600 dark:text-primary-400 shadow-sm"
                    : "text-ink-500 dark:text-ink-400"
                }`}
              >
                📖 精读
              </button>
              <button
                onClick={() => setTranscriptMode("dictate")}
                className={`px-4 py-1 text-xs font-semibold rounded-md transition-colors ${
                  transcriptMode === "dictate"
                    ? "bg-base-100 dark:bg-ink-700 text-primary-600 dark:text-primary-400 shadow-sm"
                    : "text-ink-500 dark:text-ink-400"
                }`}
              >
                ✍️ 听写
              </button>
            </div>
            <button
              onClick={() => {
                onClose();
                setTimeout(() => closePlayer(), 300); // 稍微延迟等待关闭动画
              }}
              className="w-8 h-8 flex items-center justify-center text-ink-400 hover:text-ink-600 dark:text-ink-500 dark:hover:text-ink-300 transition-colors"
              title="关闭播放器"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </header>

          {/* ── Transcript Section ── */}
          <div className="flex-1 overflow-y-auto bg-ink-50/50 dark:bg-ink-950">
            <div className="px-2 pt-3 pb-32">
              {isLoadingSubtitles ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <span className="loading loading-spinner loading-md text-primary-600" />
                  <span className="text-sm text-ink-400">加载字幕中...</span>
                </div>
              ) : subtitles.length > 0 ? (
                <InteractiveTranscript
                  subtitles={subtitles}
                  episode={currentEpisode}
                  hideToolbar={true}
                  transcriptMode={transcriptMode}
                  onTranscriptModeChange={setTranscriptMode}
                  autoScroll={autoScroll}
                  onAutoScrollChange={setAutoScroll}
                  showTranslation={showTranslation}
                  onShowTranslationChange={setShowTranslation}
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

          {/* ── Quick Actions (Thumb Zone) ── */}
          <div className="absolute bottom-[5.5rem] right-4 flex flex-col gap-2 z-30 pb-safe">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgb(0,0,0,0.1)] backdrop-blur-md transition-colors ${autoScroll ? "bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400" : "bg-base-100/90 dark:bg-ink-900/90 text-ink-500"}`}
              title="自动跟随"
            >
              <span className="material-symbols-outlined text-[20px]">
                center_focus_strong
              </span>
            </button>
            <button
              onClick={() => setShowTranslation(!showTranslation)}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgb(0,0,0,0.1)] backdrop-blur-md transition-colors ${showTranslation ? "bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400" : "bg-base-100/90 dark:bg-ink-900/90 text-ink-500"}`}
              title="显示译文"
            >
              <span className="material-symbols-outlined text-[20px]">
                translate
              </span>
            </button>
            <button
              onClick={toggleLoopMode}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgb(0,0,0,0.1)] backdrop-blur-md transition-colors ${loopMode !== "none" ? "bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400" : "bg-base-100/90 dark:bg-ink-900/90 text-ink-500"}`}
              title="循环模式"
            >
              <span className="material-symbols-outlined text-[20px]">
                {loopMode === "one" ? "repeat_one" : "repeat"}
              </span>
            </button>
          </div>

          {/* ── Floating Mini Player ── */}
          <div
            className="absolute bottom-4 left-4 right-4 h-[56px] bg-base-100/95 dark:bg-ink-900/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-base-200 dark:border-ink-800 flex items-center px-4 z-40 cursor-pointer overflow-hidden pb-safe-offset"
            onClick={() => setIsPlayerExpanded(true)}
          >
            {/* Mini Progress Bar */}
            <div className="absolute top-0 left-0 h-0.5 bg-ink-100 dark:bg-ink-800 w-full">
              <div
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Info */}
            <div className="flex flex-col flex-1 min-w-0 mr-3">
              <div className="text-sm font-bold text-ink-900 dark:text-ink-50 truncate leading-tight">
                {currentEpisode.title}
              </div>
              <div className="text-[11px] text-ink-400 dark:text-ink-500 font-mono font-medium mt-0.5">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="w-10 h-10 flex items-center justify-center bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full transition-transform active:scale-95"
              >
                <span
                  className="material-symbols-outlined text-xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {isPlaying ? "pause" : "play_arrow"}
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playNext();
                }}
                className="w-10 h-10 flex items-center justify-center text-ink-500 dark:text-ink-400 transition-transform active:scale-95"
              >
                <span className="material-symbols-outlined text-xl">
                  skip_next
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  closePlayer();
                }}
                className="w-10 h-10 flex items-center justify-center text-ink-400 hover:text-ink-600 dark:text-ink-500 dark:hover:text-ink-300 transition-transform active:scale-95"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
          </div>

          {/* ── Expanded Bottom Sheet Player ── */}
          <AnimatePresence>
            {isPlayerExpanded && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 100) setIsPlayerExpanded(false);
                }}
                className="absolute inset-x-0 bottom-0 top-14 bg-base-100 dark:bg-ink-950 z-50 rounded-t-3xl shadow-[0_-10px_40px_rgb(0,0,0,0.1)] flex flex-col border-t border-base-200 dark:border-ink-800"
              >
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                  <div className="w-12 h-1.5 rounded-full bg-ink-200 dark:bg-ink-700" />
                </div>

                <div className="flex-1 flex flex-col px-6 pt-4 pb-12 overflow-y-auto">
                  <div
                    className="w-full max-w-[320px] mx-auto aspect-[16/9] rounded-2xl shadow-xl mb-8 overflow-hidden border border-ink-100 dark:border-ink-800 shrink-0 cursor-pointer transition-transform active:scale-95 hover:shadow-2xl"
                    onClick={() => {
                      onClose();
                      router.push(`/episode/${currentEpisode.episodeid}`);
                    }}
                  >
                    <img
                      src={currentEpisode.coverUrl}
                      className="w-full h-full object-cover"
                      alt="Cover"
                    />
                  </div>

                  <div className="text-center mb-8 shrink-0">
                    <h2 className="text-xl font-bold text-ink-900 dark:text-ink-50 mb-1.5 line-clamp-2 leading-snug">
                      {currentEpisode.title}
                    </h2>
                    <p className="text-sm font-medium text-primary-600 dark:text-primary-400 truncate">
                      {currentEpisode.podcast?.title}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex flex-col gap-3 mb-8 shrink-0">
                    <div className="relative h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full group">
                      <div
                        className="absolute left-0 top-0 h-full bg-primary-600 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary-600 rounded-full shadow-sm" />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={displayTime}
                        onChange={handleSeekChange}
                        onMouseUp={handleSeekEnd}
                        onTouchEnd={handleSeekEnd}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-medium text-ink-400 font-mono">
                      <span>{formatTime(displayTime)}</span>
                      <span>-{formatTime(duration - displayTime)}</span>
                    </div>
                  </div>

                  {/* Big Controls */}
                  <div className="flex items-center justify-between mb-8 shrink-0">
                    <button
                      onClick={cyclePlaybackRate}
                      className="w-12 h-12 rounded-full bg-base-200 dark:bg-ink-800 text-ink-600 dark:text-ink-300 font-bold text-sm"
                    >
                      {playbackRate}x
                    </button>
                    <div className="flex items-center gap-6">
                      <button
                        onClick={playPrevious}
                        className="text-ink-700 dark:text-ink-300 active:scale-90 transition-transform"
                      >
                        <span className="material-symbols-outlined text-4xl">
                          skip_previous
                        </span>
                      </button>
                      <button
                        onClick={togglePlay}
                        className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-primary-600/30 active:scale-90 transition-transform"
                      >
                        <span
                          className="material-symbols-outlined text-4xl"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          {isPlaying ? "pause" : "play_arrow"}
                        </span>
                      </button>
                      <button
                        onClick={playNext}
                        className="text-ink-700 dark:text-ink-300 active:scale-90 transition-transform"
                      >
                        <span className="material-symbols-outlined text-4xl">
                          skip_next
                        </span>
                      </button>
                    </div>
                    <button
                      onClick={toggleLoopMode}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${loopMode !== "none" ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400" : "bg-base-200 dark:bg-ink-800 text-ink-600 dark:text-ink-300"}`}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {loopMode === "one" ? "repeat_one" : "repeat"}
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
