// components/controls/PlayControlBar.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePlayerStore } from "@/store/player-store";
import {
  PlayIcon,
  PauseIcon,
  XMarkIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/solid";
import { SignalIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { formatTime } from "@/lib/tools";
import { Backward15, FastForward30 } from "@/components/icons";

export default function PlayControlBar() {
  const {
    currentEpisode,
    isPlaying,
    togglePlay,
    closePlayer,
    currentTime,
    duration,
    audioRef,
    setCurrentTime,
    forward,
    backward,
  } = usePlayerStore();

  const [expanded, setExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  if (!currentEpisode) return null;

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
    <>
      {/* 1. 迷你悬浮条 (Mini Bar) */}
      <div
        className={`fixed left-0 right-0 z-40 lg:hidden transition-transform duration-300 ${expanded ? "translate-y-[150%]" : "translate-y-0"}`}
        style={{
          bottom:
            "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))",
        }}
      >
        <div className="bg-base-100/95 backdrop-blur-lg border-t border-base-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="h-16 px-4 flex items-center justify-between gap-3">
            {/* 点击左侧区域展开全屏播放器 */}
            <div
              className="flex items-center flex-1 min-w-0 group cursor-pointer"
              onClick={() => setExpanded(true)}
            >
              <div className="relative shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-base-200 border border-base-300 shadow-sm">
                {currentEpisode.coverUrl ? (
                  <Image
                    src={currentEpisode.coverUrl}
                    alt={currentEpisode.title}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-base-content/40">
                    <SignalIcon className="w-5 h-5" />
                  </div>
                )}
              </div>

              <div className="ml-3 flex flex-col justify-center min-w-0">
                <h3 className="text-sm font-semibold text-base-content truncate pr-2 leading-tight">
                  {currentEpisode.title}
                </h3>
                <p className="text-xs text-base-content/60 truncate leading-tight mt-0.5">
                  {currentEpisode.podcast?.title || "正在播放"}
                </p>
              </div>
            </div>

            {/* 右侧控制区 */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="btn btn-circle btn-sm btn-primary text-white shadow-md border-none active:scale-95 transition-transform"
              >
                {isPlaying ? (
                  <PauseIcon className="w-5 h-5" />
                ) : (
                  <PlayIcon className="w-5 h-5 ml-0.5" />
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closePlayer();
                }}
                className="p-2 rounded-full text-base-content/40 hover:bg-base-200 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* 迷你进度条指示器 */}
          <div className="h-0.5 w-full bg-base-200 absolute bottom-0 left-0">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 2. 全屏播放器 (Full Screen Overlay) */}
      <div
        className={`fixed inset-0 z-[100] bg-base-100 flex flex-col transition-transform duration-300 ease-out lg:hidden ${expanded ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* 顶部 Header */}
        <div className="flex items-center justify-between px-4 h-16 pt-safe shrink-0">
          <button
            onClick={() => setExpanded(false)}
            className="p-2 rounded-full hover:bg-base-200 transition-colors"
          >
            <ChevronDownIcon className="w-6 h-6 text-base-content" />
          </button>
          <span className="text-xs font-bold tracking-widest uppercase text-base-content/50">
            正在播放
          </span>
          <div className="w-10"></div> {/* 占位平衡 */}
        </div>

        {/* 大封面 */}
        <div className="flex-1 flex items-center justify-center p-8 min-h-0">
          <div
            className={`relative w-full max-w-[320px] aspect-square rounded-3xl overflow-hidden shadow-2xl transition-transform duration-500 ${isPlaying ? "scale-100" : "scale-95"}`}
          >
            <Image
              src={currentEpisode.coverUrl}
              alt="cover"
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* 控制面板 */}
        <div className="px-8 pb-safe mb-8 shrink-0 space-y-8">
          {/* 标题信息 */}
          <div className="text-center">
            <h2 className="text-2xl font-bold line-clamp-2 text-base-content leading-tight">
              {currentEpisode.title}
            </h2>
            <p className="text-base-content/60 mt-2 text-sm">
              {currentEpisode.podcast?.title}
            </p>
          </div>

          {/* 进度条 */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={displayTime}
              onChange={handleSeekChange}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              className="range range-primary range-xs w-full"
            />
            <div className="flex justify-between text-xs text-base-content/50 font-mono">
              <span>{formatTime(displayTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* 播放控制按钮 */}
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={backward}
              className="active:scale-90 transition-transform text-base-content hover:text-primary"
            >
              <Backward15 size={40} fill="currentColor" />
            </button>
            <button
              onClick={togglePlay}
              className="w-20 h-20 bg-primary text-primary-content rounded-full flex items-center justify-center shadow-xl shadow-primary/30 active:scale-95 transition-transform"
            >
              {isPlaying ? (
                <PauseIcon className="w-10 h-10" />
              ) : (
                <PlayIcon className="w-10 h-10 ml-1" />
              )}
            </button>
            <button
              onClick={forward}
              className="active:scale-90 transition-transform text-base-content hover:text-primary"
            >
              <FastForward30 size={40} fill="currentColor" />
            </button>
          </div>

          {/* 底部操作 */}
          <div className="pt-4">
            <Link
              href={`/episode/${currentEpisode.episodeid}`}
              onClick={() => setExpanded(false)}
              className="btn btn-block btn-outline border-base-300 text-base-content hover:bg-base-200 hover:border-base-300 rounded-2xl h-14"
            >
              <DocumentTextIcon className="w-5 h-5 mr-1" />
              进入精读模式
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
