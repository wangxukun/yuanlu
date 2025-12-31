"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePlayerStore } from "@/store/player-store";
import {
  PlayIcon,
  PauseIcon,
  XMarkIcon,
  SignalIcon, // 1. 引入合适的替代图标
} from "@heroicons/react/24/solid";

export default function PlayControlBar() {
  // 从 Store 获取状态
  const { currentEpisode, isPlaying, togglePlay, closePlayer } =
    usePlayerStore();

  // 如果没有播放内容，不渲染
  if (!currentEpisode) return null;

  return (
    // [Layout] Fixed 定位底部，z-index 确保在最上层
    // [Responsive] xl:hidden 确保仅在 XL 以下尺寸显示 (Mobile/Tablet)
    <div className="fixed bottom-0 left-0 right-0 z-50 xl:hidden">
      {/* 容器背景：半透明毛玻璃 + 顶部边框 + 阴影 */}
      <div className="bg-base-100/95 backdrop-blur-lg border-t border-base-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="h-16 px-4 max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* 3. 左侧交互区：点击跳转至精读详情页 */}
          <Link
            href={`/episode/${currentEpisode.episodeid}`}
            className="flex items-center flex-1 min-w-0 group cursor-pointer"
          >
            {/* 2. 封面图与占位图标 */}
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

            {/* 2. 标题信息：截断显示 */}
            <div className="ml-3 flex flex-col justify-center min-w-0">
              <h3 className="text-sm font-semibold text-base-content truncate pr-2 leading-tight">
                {currentEpisode.title}
              </h3>
              <p className="text-xs text-base-content/60 truncate leading-tight mt-0.5">
                {/* 如果有 podcastTitle 字段显示，否则显示状态文本 */}
                {currentEpisode.title || "正在播放"}
              </p>
            </div>
          </Link>

          {/* 右侧控制区 */}
          <div className="flex items-center gap-3 shrink-0">
            {/* 播放/暂停按钮 */}
            <button
              onClick={(e) => {
                e.preventDefault(); // 阻止 Link 跳转
                e.stopPropagation();
                togglePlay();
              }}
              className="btn btn-circle btn-sm btn-primary text-white shadow-md border-none hover:scale-105 active:scale-95 transition-transform"
            >
              {isPlaying ? (
                <PauseIcon className="w-5 h-5" />
              ) : (
                <PlayIcon className="w-5 h-5 ml-0.5" />
              )}
            </button>

            {/* 关闭按钮 */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                closePlayer();
              }}
              className="p-2 rounded-full text-base-content/40 hover:bg-base-200 hover:text-base-content transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
