"use client";
import { usePlayerStore } from "@/store/player-store";
import { useEffect, useRef } from "react";

export default function Player() {
  const {
    isPlaying,
    currentTime,
    duration,
    currentEpisode,
    togglePlay,
    setCurrentTime,
  } = usePlayerStore();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      // isPlaying ? audioRef.current.play() : audioRef.current.pause();
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.play();
        } else {
          audioRef.current.pause();
        }
      }
    }
  }, [isPlaying]);

  return (
    <div className="flex items-center w-full space-x-4">
      {/* 封面图片 */}
      {currentEpisode && (
        <img
          src={currentEpisode.imageUrl}
          alt="封面"
          className="w-12 h-12 rounded-lg object-cover"
        />
      )}

      {/* 进度条和播放信息 */}
      <div className="flex-1">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{currentEpisode?.title || "暂无播放"}</span>
          <span>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={(e) => setCurrentTime(Number(e.target.value))}
          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />

        <div className="flex items-center justify-center mt-1">
          <button
            onClick={togglePlay}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedData={(e) => setCurrentTime(e.currentTarget.duration)}
        src="/static/audio/20240815.mp3" // 替换实际音频路径
      />
    </div>
  );
}

// 时间格式化工具函数
function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
