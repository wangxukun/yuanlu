"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  EllipsisHorizontalIcon,
  HeartIcon,
  ShareIcon,
  ArrowTopRightOnSquareIcon,
  PlayIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/outline";
import { TrendingPodcastItem } from "@/lib/discover-service";
import { Headphones } from "lucide-react";

interface TrendingRowProps {
  podcast: TrendingPodcastItem;
  rank: number;
}

export default function TrendingRow({ podcast, rank }: TrendingRowProps) {
  const router = useRouter();

  const handleRowClick = () => {
    router.push(`/podcast/${podcast.podcastid}`);
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
    const elem = document.activeElement as HTMLElement;
    if (elem) elem.blur();
  };

  const handlePlayLatest = () => {
    console.log("Play latest", podcast.title);
  };
  const handleToggleFavorite = () => {
    console.log("Toggle favorite", podcast.title);
  };
  const handleShare = () => {
    console.log("Share", podcast.title);
  };

  return (
    <div
      onClick={handleRowClick}
      // [布局优化]:
      // 1. Mobile/Tablet: p-3 (更紧凑)
      // 2. Desktop (xl): p-4 (保持原样)
      className="flex items-center p-3 xl:p-4 hover:bg-base-200/50 transition-colors border-b border-base-200 last:border-0 group cursor-pointer relative first:rounded-t-3xl last:rounded-b-3xl"
    >
      {/* 排名: Mobile w-6 / Desktop w-8 */}
      <div className="w-6 xl:w-8 text-center font-bold text-base-content/40 group-hover:text-primary text-sm xl:text-base">
        {rank}
      </div>

      {/* 封面图: Mobile w-10 h-10 / Desktop w-12 h-12 */}
      <div className="relative mx-3 xl:mx-4 flex-shrink-0 w-10 h-10 xl:w-12 xl:h-12 rounded-lg overflow-hidden bg-base-300">
        <Image
          src={podcast.coverUrl}
          alt={podcast.title}
          fill
          className="object-cover"
        />
      </div>

      {/* 信息区域 */}
      <div className="flex-1 min-w-0 pr-2 xl:pr-4">
        {/* 标题字号适配 */}
        <h3 className="text-sm font-bold text-base-content truncate leading-tight">
          {podcast.title}
        </h3>
        <div className="flex items-center space-x-2 text-xs text-base-content/60 mt-0.5 xl:mt-0">
          <span className="truncate max-w-[80px] sm:max-w-none">
            {podcast.platform || "Yuanlu"}
          </span>
          <span>•</span>
          <span>{podcast.category}</span>
        </div>
      </div>

      {/* 统计数据: 仅在 Tablet(sm) 和 Desktop 显示，手机端隐藏以节省空间 */}
      <div className="hidden sm:flex items-center space-x-4 xl:space-x-6 mr-2 xl:mr-6">
        <div
          className="flex items-center text-xs text-base-content/60"
          title="剧集数量"
        >
          <Square3Stack3DIcon className="w-3.5 h-3.5 mr-1" />
          {podcast.episodeCount}{" "}
          <span className="hidden xl:inline ml-1">Eps</span>
        </div>
        <div
          className="flex items-center text-xs text-base-content/60"
          title="总播放量"
        >
          <Headphones className="w-3.5 h-3.5 mr-1" />
          {podcast.totalPlays.toLocaleString()}
        </div>
      </div>

      {/* 操作菜单 */}
      <div
        className="dropdown dropdown-end"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          tabIndex={0}
          role="button"
          // Mobile: 增大触摸热区但图标保持小尺寸
          className="btn btn-ghost btn-circle btn-sm text-base-content/40 hover:text-base-content hover:bg-base-200 w-8 h-8 xl:w-8 xl:h-8"
        >
          <EllipsisHorizontalIcon className="w-5 h-5" />
        </div>

        <ul
          tabIndex={0}
          className="dropdown-content z-[20] menu p-2 shadow-xl bg-base-100 rounded-box w-48 xl:w-52 border border-base-200"
        >
          <li>
            <button onClick={(e) => handleAction(e, handlePlayLatest)}>
              <PlayIcon className="w-4 h-4" />
              播放最新
            </button>
          </li>
          <li>
            <button onClick={(e) => handleAction(e, handleToggleFavorite)}>
              <HeartIcon className="w-4 h-4" />
              收藏系列
            </button>
          </li>
          <div className="divider my-0"></div>
          <li>
            <button onClick={(e) => handleAction(e, handleShare)}>
              <ShareIcon className="w-4 h-4" />
              分享
            </button>
          </li>
          <li>
            <Link
              href={`/podcast/${podcast.podcastid}`}
              onClick={(e) => e.stopPropagation()}
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              详情
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
