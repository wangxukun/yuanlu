"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { PlayCircleIcon } from "@heroicons/react/24/solid";
import { RecentHistoryItemDto } from "@/core/listening-history/dto";

interface ContinueListeningProps {
  history: RecentHistoryItemDto[];
  onPlay: (id: string) => void;
}

export default function ContinueListening({
  history,
  onPlay,
}: ContinueListeningProps) {
  // 如果没有更多历史记录（除了最近的那一条），则隐藏整个区块
  if (!history || history.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-base-content">继续收听</h2>
        <Link
          href="/library/history"
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          查看历史
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {history.map((item) => (
          <div
            key={item.historyId}
            className="bg-base-100 p-4 rounded-xl shadow-sm border border-base-200 hover:shadow-md transition-shadow cursor-pointer flex items-center space-x-4 group"
            onClick={() => onPlay(item.episodeId)}
          >
            <div className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-base-300">
              <Image
                src={item.coverUrl}
                alt={item.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                <PlayCircleIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-base-content line-clamp-2 mb-1">
                {item.title}
              </h3>
              <p className="text-xs text-base-content/60 mb-2 truncate">
                {item.author}
              </p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-1 bg-base-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${item.progress}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-base-content/40 font-medium">
                  {item.progress}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
