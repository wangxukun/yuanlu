// components/player/Player.tsx
"use client";

import { useState } from "react";
import { usePlayerStore } from "@/store/player-store";
import { formatTime } from "@/lib/tools";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import PodcastIcon from "@/components/icons/PodcastIcon";
import Link from "next/link";

export default function Player() {
  const { currentEpisode, currentTime, duration, audioRef, setCurrentTime } =
    usePlayerStore();

  // 本地拖拽状态，让进度条拖动更丝滑
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  const displayTime = isDragging ? dragTime : currentTime;

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

  return (
    <div className="flex items-center w-full gap-4 px-2">
      {/* 1. 封面与基本信息区域 */}
      <div className="flex items-center gap-3 w-1/3 min-w-[140px] max-w-[200px]">
        {currentEpisode ? (
          <Link
            href={`/episode/${currentEpisode.episodeid}`}
            className="relative group shrink-0 block cursor-pointer"
            title="进入精读模式"
          >
            <div className="w-12 h-12 rounded-md overflow-hidden shadow-sm border border-base-300/50">
              <img
                src={currentEpisode.coverUrl}
                alt="封面"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md backdrop-blur-[1px]">
              <DocumentTextIcon className="w-5 h-5 text-white" />
            </div>
          </Link>
        ) : (
          <div className="w-12 h-12 rounded-md bg-base-200 flex items-center justify-center text-base-content/20">
            <PodcastIcon size={24} fill="currentColor" />
          </div>
        )}

        <div className="flex flex-col min-w-0 justify-center">
          {currentEpisode ? (
            <Link
              href={`/episode/${currentEpisode.episodeid}`}
              className="text-sm font-semibold truncate text-base-content block hover:text-primary transition-colors"
            >
              {currentEpisode.title}
            </Link>
          ) : (
            <span className="text-sm font-semibold truncate text-base-content block">
              未播放
            </span>
          )}

          <span className="text-xs text-base-content/60 truncate block">
            {currentEpisode?.podcast?.title || "选择一集开始收听"}
          </span>
        </div>
      </div>

      {/* 2. 进度条区域 */}
      <div className="flex flex-col flex-1 justify-center gap-1">
        <div className="flex items-center gap-3 w-full">
          <span className="text-xs text-base-content/50 font-mono min-w-[40px] text-right">
            {formatTime(displayTime)}
          </span>

          <input
            type="range"
            min="0"
            max={duration || 0}
            value={displayTime}
            onChange={handleSeekChange}
            onMouseUp={handleSeekEnd}
            onTouchEnd={handleSeekEnd}
            disabled={!currentEpisode}
            className={`range range-xs w-full ${
              currentEpisode
                ? "range-primary cursor-pointer"
                : "range-disabled opacity-50"
            }`}
          />

          <span className="text-xs text-base-content/50 font-mono min-w-[40px]">
            {formatTime(duration || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
