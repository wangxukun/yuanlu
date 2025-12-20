"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  // PlayCircleIcon,
  EllipsisHorizontalIcon,
  // MusicalNoteIcon,
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

  // ... handlePlayLatest, handleToggleFavorite, handleShare ...
  const handlePlayLatest = () => {
    /* ... */
  };
  const handleToggleFavorite = () => {
    /* ... */
  };
  const handleShare = () => {
    /* ... */
  };

  return (
    <div
      onClick={handleRowClick}
      // [修改点]：
      // 1. 添加 first:rounded-t-3xl 和 last:rounded-b-3xl (配合父级的 rounded-3xl)
      // 2. 保持 group cursor-pointer 等原有样式
      className="flex items-center p-4 hover:bg-base-200/50 transition-colors border-b border-base-200 last:border-0 group cursor-pointer relative first:rounded-t-3xl last:rounded-b-3xl"
    >
      {/* ... 排名、封面、信息、统计数据 (保持不变) ... */}
      <div className="w-8 text-center font-bold text-base-content/40 group-hover:text-primary">
        {rank}
      </div>

      <div className="relative mx-4 flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-base-300">
        <Image
          src={podcast.coverUrl}
          alt={podcast.title}
          fill
          className="object-cover"
        />
        {/*<div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">*/}
        {/*  <PlayCircleIcon className="w-6 h-6 text-white" />*/}
        {/*</div>*/}
      </div>

      <div className="flex-1 min-w-0 pr-4">
        <h3 className="text-sm font-bold text-base-content truncate">
          {podcast.title}
        </h3>
        <div className="flex items-center space-x-2 text-xs text-base-content/60">
          <span>{podcast.platform || "Yuanlu"}</span>
          <span>•</span>
          <span>{podcast.category}</span>
        </div>
      </div>

      <div className="hidden sm:flex items-center space-x-6 mr-6">
        <div
          className="flex items-center text-xs text-base-content/60"
          title="剧集数量"
        >
          <Square3Stack3DIcon className="w-3.5 h-3.5 mr-1" />
          {podcast.episodeCount} Eps
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
          className="btn btn-ghost btn-circle btn-sm text-base-content/40 hover:text-base-content hover:bg-base-200"
        >
          <EllipsisHorizontalIcon className="w-5 h-5" />
        </div>

        {/* Dropdown 内容 */}
        {/* z-[10] 确保它浮在下方元素的上方 */}
        <ul
          tabIndex={0}
          className="dropdown-content z-[20] menu p-2 shadow-xl bg-base-100 rounded-box w-52 border border-base-200"
        >
          <li>
            <button onClick={(e) => handleAction(e, handlePlayLatest)}>
              <PlayIcon className="w-4 h-4" />
              播放最新一集
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
              分享链接
            </button>
          </li>
          <li>
            <Link
              href={`/podcast/${podcast.podcastid}`}
              onClick={(e) => e.stopPropagation()}
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              查看详情
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
