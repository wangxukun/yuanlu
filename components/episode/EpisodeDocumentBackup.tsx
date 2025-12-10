"use client";
import React, { useState, useEffect } from "react";
import { usePlayerStore } from "@/store/player-store";
import { ArrowUturnLeftIcon, SunIcon } from "@heroicons/react/24/solid";
import { useSession } from "next-auth/react";
import { LanguageIcon } from "@heroicons/react/24/outline";
import { Episode } from "@/core/episode/episode.entity";

interface Subtitles {
  id: number;
  startTime: string;
  endTime: string;
  textEn: string;
  textZh: string;
}

export default function EpisodeDocument({
  subtitle,
  episode,
}: {
  subtitle: Subtitles[];
  episode: Episode;
}) {
  const [subtitles, setSubtitles] = useState<Subtitles[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubtitleId, setActiveSubtitleId] = useState<number | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);

  // 获取播放器状态
  const currentTime = usePlayerStore((state) => state.currentTime);
  const setCurrentTime = usePlayerStore((state) => state.setCurrentTime);
  const currentEpisode = usePlayerStore((state) => state.currentEpisode);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const audioRef = usePlayerStore((state) => state.audioRef);
  const play = usePlayerStore((state) => state.play);
  const { data: session, status } = useSession();

  // 处理字幕点击事件
  const handleSubtitleClick = (subtitle: Subtitles) => {
    const startTime = convertTimeToSeconds(subtitle.startTime);
    setCurrentTime(startTime);
    if (audioRef) {
      try {
        // 更新播放时间点
        audioRef.currentTime = startTime;
        // 播放新的音频
        play();
      } catch (error) {
        console.error("Error while switching audio source:", error);
      }
    }
  };

  useEffect(() => {
    try {
      // 如果用户已登录，则显示全部字幕，否则只显示前15个字幕
      if (status === "authenticated" && session) {
        setSubtitles(subtitle);
      } else {
        if (subtitle.length > 15) {
          setSubtitles(subtitle.slice(0, 15));
        } else {
          setSubtitles(subtitle);
        }
      }
      setError(null);
    } catch (err) {
      console.error("Failed to fetch subtitles:", err);
      setError("Failed to load subtitles. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [subtitle, session]); // 修复依赖项为 subtitle 而不是 subtitles

  // 监听播放时间变化，更新高亮字幕
  useEffect(() => {
    if (!isPlaying || subtitles.length === 0) {
      setActiveSubtitleId(null);
      return;
    }
    // 将当前时间转换为秒数
    const currentSeconds = currentTime;

    // 在当前音频播放页面时，更新高亮字幕
    if (currentEpisode && currentEpisode.episodeid === episode.episodeid) {
      // 查找当前应该高亮的字幕
      const activeSubtitle = subtitles.find((sub) => {
        const startTimeTime = convertTimeToSeconds(sub.startTime);
        const endTimeTime = convertTimeToSeconds(sub.endTime);
        return currentSeconds >= startTimeTime && currentSeconds <= endTimeTime;
      });
      setActiveSubtitleId(activeSubtitle?.id || null);
    }
    // 当音频在播放时，currentTime会不断变化
  }, [currentTime, isPlaying, subtitles]);

  // 将时间字符串 (HH:MM:SS,mmm) 转换为秒数
  const convertTimeToSeconds = (timeStr: string): number => {
    const [hms, ms] = timeStr.split(",");
    const [hours, minutes, seconds] = hms.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds + Number(ms) / 1000;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/10 border-l-4 border-error p-4">
        <div className="flex">
          <div className="shrink-0">
            <svg
              className="h-5 w-5 text-error"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-error-content">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (subtitles.length === 0) {
    return (
      <div className="bg-base-200 border-l-4 border-base-300 p-4">
        <div className="flex">
          <div className="shrink-0">
            <svg
              className="h-5 w-5 text-base-content/50"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-base-content">本集没有字幕</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] rounded-lg overflow-hidden">
      <div className="flex justify-between py-4 border-b border-base-200">
        <h3 className="text-base font-medium text-base-content/70">剧集文稿</h3>
        {/* 新增翻译切换按钮 */}
        <button
          onClick={() => setShowTranslation(!showTranslation)}
          className="btn btn-sm btn-ghost"
        >
          <LanguageIcon className="h-4 w-4" />
          <span>{showTranslation ? "隐藏翻译" : "显示翻译"}</span>
        </button>
      </div>
      <div className="divide-y divide-base-200 select-none">
        {subtitles.map((subtitle) => (
          <div
            key={subtitle.id}
            onClick={() => handleSubtitleClick(subtitle)}
            className={`group/item py-2 transition-colors duration-150 ${
              activeSubtitleId === subtitle.id
                ? "bg-primary/10" // 高亮样式
                : "px-7 hover:bg-base-200" // 默认悬停样式
            }`}
          >
            <div
              className={`text-base-content hover:cursor-pointer leading-relaxed ${
                activeSubtitleId === subtitle.id ? "font-medium" : ""
              }`}
            >
              <p className="flex items-center">
                {activeSubtitleId === subtitle.id && (
                  <SunIcon className="inline-block h-4 w-4 mr-3 text-primary" />
                )}
                {subtitle.textEn}
                <ArrowUturnLeftIcon className="invisible group-hover/item:visible inline-block h-4 w-4 ml-2 text-base-content/30" />
              </p>
              {showTranslation && (
                <p
                  className={`text-base-content/70 text-xs ${activeSubtitleId === subtitle.id ? "px-7" : ""}`}
                >
                  {subtitle.textZh}
                </p>
              )}
            </div>
          </div>
        ))}
        {status === "unauthenticated" && (
          <div className="flex justify-center py-4">
            <button
              className="btn btn-outline btn-primary"
              onClick={() =>
                (
                  document.getElementById(
                    "email_check_modal_box",
                  ) as HTMLDialogElement
                )?.showModal()
              }
            >
              全部文稿
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
