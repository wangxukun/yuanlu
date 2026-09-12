"use client";

import React, { useState, useRef } from "react";
import { Play, Pause, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getEpisodeAudioUrl } from "@/lib/client/episode-audio";

interface SentenceMicroPlayerProps {
  episodeid: string;
  startTime: number;
  endTime: number;
  className?: string;
}

/**
 * 句子微播放器（复刻自 yuanlu-podcast components/sentence/SentenceMicroPlayer）：
 * 按 startTime→endTime 精准截取播放剧集原音，提供播放/暂停、重听、
 * 进度切片可视化与「单句循环」。
 * 音频直链按 episodeid 懒加载（模块级缓存，与语音评测/生词本同源）。
 */
export default function SentenceMicroPlayer({
  episodeid,
  startTime,
  endTime,
  className = "",
}: SentenceMicroPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [isLoop, setIsLoop] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // 循环开关镜像到 ref，切换时不重建/不打断正在播放的音频
  const isLoopRef = useRef(isLoop);
  isLoopRef.current = isLoop;

  const duration = Math.max(0.5, endTime - startTime);
  const progressPercent = Math.min(
    100,
    Math.max(0, ((currentTime - startTime) / duration) * 100),
  );

  const ensureAudio = async (): Promise<HTMLAudioElement | null> => {
    if (audioRef.current) return audioRef.current;

    setIsLoading(true);
    try {
      const audioUrl = await getEpisodeAudioUrl(episodeid);
      if (!audioUrl) {
        toast.error("暂时无法播放原声");
        return null;
      }

      const audio = new Audio();
      audio.preload = "auto";
      audio.setAttribute("src", audioUrl);

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);

        if (audio.currentTime >= endTime) {
          if (isLoopRef.current) {
            audio.currentTime = startTime;
            audio.play().catch(() => {});
          } else {
            audio.pause();
            audio.currentTime = startTime;
            setIsPlaying(false);
            setCurrentTime(startTime);
          }
        }
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(startTime);
      };

      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleEnded);

      audioRef.current = audio;
      return audio;
    } catch {
      toast.error("原声信息加载失败");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = async () => {
    const audio = await ensureAudio();
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (audio.currentTime < startTime || audio.currentTime >= endTime) {
        audio.currentTime = startTime;
      }
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          console.warn("Audio playback was blocked or failed");
          toast.error("原声播放失败");
        });
    }
  };

  const replay = async () => {
    const audio = await ensureAudio();
    if (!audio) return;
    audio.currentTime = startTime;
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {});
  };

  return (
    <div
      className={`flex items-center gap-2.5 bg-gray-100 dark:bg-ink-800 px-3 py-1.5 rounded-full border border-gray-200/80 dark:border-ink-700 text-xs ${className}`}
    >
      {/* Play / Pause button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={isLoading}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
          isPlaying
            ? "bg-indigo-600 text-white shadow-sm scale-105"
            : "bg-white dark:bg-ink-900 text-gray-700 dark:text-ink-100 shadow-sm hover:bg-gray-200 dark:hover:bg-ink-700"
        }`}
        title={isPlaying ? "暂停" : "播放原音截取"}
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isPlaying ? (
          <Pause size={14} fill="currentColor" />
        ) : (
          <Play size={14} className="ml-0.5" fill="currentColor" />
        )}
      </button>

      {/* Replay button */}
      <button
        type="button"
        onClick={replay}
        className="w-7 h-7 rounded-full flex items-center justify-center bg-white dark:bg-ink-900 hover:bg-gray-200 dark:hover:bg-ink-700 text-gray-500 dark:text-ink-300 hover:text-gray-700 dark:hover:text-ink-100 transition-colors shadow-sm"
        title="重听该句"
      >
        <RotateCcw size={12} />
      </button>

      {/* Progress slice visualization */}
      <div className="w-16 sm:w-24 flex flex-col justify-center gap-1">
        <div className="w-full bg-gray-200 dark:bg-ink-700 h-1 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-gray-400 dark:text-ink-400 font-mono leading-none">
          <span>{Math.max(0, currentTime - startTime).toFixed(1)}s</span>
          <span>{duration.toFixed(1)}s</span>
        </div>
      </div>

      {/* Loop toggle */}
      <button
        type="button"
        onClick={() => setIsLoop(!isLoop)}
        className={`px-2 py-0.5 rounded-full font-semibold text-[11px] transition-colors border ${
          isLoop
            ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/40"
            : "bg-white dark:bg-ink-900 border-gray-300 dark:border-ink-600 text-gray-500 dark:text-ink-300 hover:text-gray-700 dark:hover:text-ink-100"
        }`}
        title={isLoop ? "循环开启中" : "开启单句单曲循环"}
      >
        单句循环
      </button>
    </div>
  );
}
