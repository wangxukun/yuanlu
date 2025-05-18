"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Episode } from "@/app/types/podcast";
import { formatTime } from "@/app/lib/tools";

export default function EpisodeList({ episodes }: { episodes: Episode[] }) {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  // 收藏状态
  // const [isCollected, setIsCollected] = useState(false);

  // 排序函数
  const sortedEpisodes = [...episodes].sort((a, b) => {
    const dateA = new Date(a.publishAt).getTime();
    const dateB = new Date(b.publishAt).getTime();
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  return (
    <div className="p-1 mb-6">
      {/* 排序按钮 */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="btn btn-ghost btn-sm"
        >
          {sortOrder === "asc" ? "最新优先" : "最早优先"}
        </button>
      </div>

      {/* 分割线 */}
      <div className="border-t border-gray-300 mb-4"></div>

      {/* 节目列表 */}
      {sortedEpisodes.map((episode) => (
        <Link key={episode.episodeid} href={`/episode/${episode.episodeid}`}>
          <div className="group/item border-b border-gray-300 p-2 hover:bg-zinc-200 rounded-lg last:border-b-0">
            <div className="flex items-center space-x-4">
              {/* 节目图片 */}
              <div className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0">
                <Image
                  src={episode.coverUrl}
                  alt={episode.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                {/* 播放图标 */}
                <div className="absolute bottom-5 left-5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                  <div className="bg-black/50 rounded-full p-2 backdrop-blur-xs">
                    <svg
                      className="w-6 h-6 text-white"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              {/* 节目信息 */}
              <div className="flex-1 text-sm max-w-[900px]">
                <p className="text-gray-500 text-xs">
                  {episode.publishAt.split("T")[0]}
                </p>
                <div className="text-gray-600 hover:underline text-base font-bold transition-colors">
                  {episode.title}
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-500 line-clamp-3">
                    {episode.description}
                  </span>
                </div>
              </div>
              <div className="flex flex-1 items-center justify-center">
                <span className="text-xs text-gray-500">
                  {formatTime(episode.duration)}
                </span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
