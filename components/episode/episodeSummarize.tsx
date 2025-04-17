"use client";

import Image from "next/image";
import { Episode } from "@/app/types/podcast";
import { formatTime } from "@/app/lib/tools";
import { useState } from "react";
import { usePlayerStore } from "@/store/player-store";

export default function EpisodeSummarize({ episode }: { episode: Episode }) {
  // 状态管理：收藏状态
  const [isCollected, setIsCollected] = useState(false);
  const { isPlaying, togglePlay } = usePlayerStore();
  return (
    <div className="flex flex-col justify-start w-full max-w-[1200px]">
      <div className="flex items-start space-x-6 mb-8">
        {/* 修改为16:9比例的图片容器 */}
        <div className="relative w-48 aspect-video rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={episode.coverUrl}
            alt={episode.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>

        {/* 单集详细信息 */}
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-800 mb-2">
            {episode.title}
          </h1>

          {/* 新增分类标签 */}
          <div className="flex items-center space-x-2 mb-1">
            <p className="text-sm text-gray-500">{episode.category.from}</p>
            <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
              {episode.category.title}
            </span>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            {episode.publishAt} · {formatTime(episode.duration)}
          </p>

          {/* 操作按钮组 */}
          <div className="flex items-center space-x-4">
            {/* 收藏按钮 */}
            <button
              onClick={() => setIsCollected(!isCollected)} // 点击切换收藏状态
              className={`flex items-center text-xs px-2 py-1 rounded-lg transition-colors ${
                isCollected
                  ? "bg-red-100 text-red-600 hover:bg-red-200" // 已收藏状态样式
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200" // 未收藏状态样式
              }`}
            >
              {/* 收藏图标 */}
              <svg
                className="w-5 h-5 mr-2"
                fill={isCollected ? "currentColor" : "none"} // 动态填充状态
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              收藏
            </button>

            {/* 文档下载链接 */}
            <a
              href="#"
              className="flex items-center px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              下载文稿
            </a>

            <button
              onClick={() => {
                togglePlay();
              }}
              className="flex items-center px-4 py-1 bg-slate-200 text-xs text-gray-500 rounded-lg hover:bg-slate-300 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                {isPlaying ? (
                  // 暂停图标
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                ) : (
                  // 播放图标
                  <path
                    fillRule="evenodd"
                    d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                    clipRule="evenodd"
                  />
                )}
              </svg>
              {isPlaying ? "暂停" : "播放"}
            </button>
          </div>
        </div>
      </div>

      {/* 第二行：单集简介 */}
      <div className="flex flex-col mb-8">
        <h2 className="text-lg font-bold text-slate-500 mb-4">单集简介</h2>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
          {episode.description}
        </p>
      </div>
    </div>
  );
}
