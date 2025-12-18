"use client";

import React from "react";
import { PlayCircleIcon, HeartIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import { usePlayerStore } from "@/store/player-store";
import { toggleEpisodeFavorite } from "@/lib/actions/favorite-actions";
import { usePathname } from "next/navigation";
import { Episode } from "@/core/episode/episode.entity";

// 扩展 Episode 类型以包含收藏状态
interface EpisodeWithFav extends Episode {
  isFavorited?: boolean;
}

interface EpisodeListProps {
  episodes: EpisodeWithFav[];
}

export default function EpisodeList({ episodes }: EpisodeListProps) {
  const { playEpisode } = usePlayerStore();
  const pathname = usePathname();

  // 处理单集收藏
  const handleToggleFav = async (e: React.MouseEvent, epId: string) => {
    e.stopPropagation();
    e.preventDefault();
    await toggleEpisodeFavorite(epId, pathname);
    // 注意：这里没有做复杂的乐观更新，直接等待 revalidatePath 刷新
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">包含剧集 ({episodes.length})</h2>
      </div>

      <div className="bg-base-100 rounded-2xl border border-base-200 overflow-hidden">
        {episodes.map((episode, index) => (
          <div
            key={episode.episodeid}
            className="group flex items-center p-4 hover:bg-base-200/50 transition-colors border-b border-base-200 last:border-0 cursor-pointer"
            onClick={() => playEpisode(episode)}
          >
            {/* 序号 */}
            <span className="w-8 text-center text-base-content/40 font-medium group-hover:text-primary">
              {index + 1}
            </span>

            {/* 列表项其余部分... */}
            <div className="flex-1 px-4 min-w-0">
              <div className="flex justify-between items-start">
                <h3 className="font-bold truncate pr-2 text-base-content group-hover:text-primary transition-colors">
                  {episode.title}
                </h3>
              </div>
              <div className="text-xs text-base-content/50 mt-1 flex gap-3">
                <span>{formatDuration(episode.duration)}</span>
                {/* 新增：播放量 */}
                <span>{(episode.playCount || 0).toLocaleString()} 次播放</span>
                <span>{new Date(episode.publishAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* 播放按钮 */}
            <button className="btn btn-ghost btn-circle btn-sm text-primary opacity-0 group-hover:opacity-100 transition-all mr-2">
              <PlayCircleIcon className="w-8 h-8" />
            </button>

            {/* 新增：收藏按钮 */}
            <button
              className="btn btn-ghost btn-circle btn-sm text-base-content/40 hover:text-red-500 z-10"
              onClick={(e) => handleToggleFav(e, episode.episodeid)}
            >
              {episode.isFavorited ? (
                <HeartSolid className="w-5 h-5 text-red-500" />
              ) : (
                <HeartIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDuration(seconds: number) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}
