"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Episode {
  id: string;
  title: string;
  date: string;
  duration: string;
  imageUrl: string; // 每个节目的图片地址
  isPlaying?: boolean;
}

interface ProgramListProps {
  programTitle: string;
  programPublisher: string;
  programCategory: string;
  episodes: Episode[];
}

export default function ProgramList({
  programTitle,
  programPublisher,
  programCategory,
  episodes,
}: ProgramListProps) {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isCollected] = useState(false);

  // 排序函数
  const sortedEpisodes = [...episodes].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6 w-[800px] max-w-[50vw] min-w-[200px]">
      {/* 节目标题、发布者和分类 */}
      <div className="mb-2">
        <h1 className="text-xl font-bold text-gray-800">{programTitle}</h1>
        <p className="text-sm text-gray-500">{programPublisher}</p>
        <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
          {programCategory}
        </span>
      </div>

      {/* 排序按钮 */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
        >
          {sortOrder === "asc" ? "最新优先" : "最早优先"}
        </button>
      </div>

      {/* 分割线 */}
      <div className="border-t border-gray-100 mb-4"></div>

      {/* 节目列表 */}
      <div className="space-y-4">
        {sortedEpisodes.map((episode) => (
          <div
            key={episode.id}
            className="border-b border-gray-100 pb-4 last:border-b-0"
          >
            <div className="flex items-start space-x-2">
              {/* 节目信息 */}
              <div className="flex-1 text-sm">
                <p className="text-gray-500 mb-1">{episode.date}</p>
                <div className="flex items-center justify-start mb-2">
                  <Link
                    href={`/episode/${episode.id}?collected=${isCollected}`}
                    className="text-gray-800 hover:text-blue-600 text-sm transition-colors"
                  >
                    {episode.title}
                  </Link>
                  <Link
                    href={`/episode/${episode.id}`}
                    className="text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>

                {/* 播放按钮和时长 */}
                <div className="flex items-center space-x-4">
                  <button className="bg-slate-200 hover:bg-slate-300 text-xs text-gray-500 px-4 py-1 rounded-lg transition-colors flex items-center">
                    <svg
                      className="w-4 h-4 mr-2"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {episode.isPlaying ? "继续播放" : "播放"}
                  </button>
                  <span className="text-xs text-gray-500">
                    {episode.duration}
                  </span>
                </div>
              </div>

              {/* 节目图片 */}
              <div className="relative w-40 aspect-[16/9] rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={episode.imageUrl}
                  alt={episode.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
