import React from "react";
import Image from "next/image";
import { ShareIcon, HeartIcon } from "@heroicons/react/24/outline";
import {
  PlayIcon as PlaySolidIcon,
  HeartIcon as HeartSolidIcon,
} from "@heroicons/react/24/solid";

interface PodcastHeroProps {
  podcast: {
    title: string;
    coverUrl: string;
    platform: string | null;
    tags: Array<{ id: number; name: string }>;
  };
  initialPlays: number;
  favoritesCount: number;
  isFavorited: boolean;
  isLoadingFavorite: boolean;
  onPlayLatest: () => void;
  onToggleFavorite: () => void;
}

export default function PodcastHero({
  podcast,
  initialPlays,
  favoritesCount,
  isFavorited,
  isLoadingFavorite,
  onPlayLatest,
  onToggleFavorite,
}: PodcastHeroProps) {
  return (
    <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 lg:sticky lg:top-28 flex flex-col items-center lg:items-start text-center lg:text-left z-20">
      {/* 封面 */}
      <div className="relative w-full aspect-square rounded-[2rem] overflow-hidden border border-base-200/50 mb-6 lg:mb-8 group bg-base-200">
        <Image
          src={podcast.coverUrl}
          alt={podcast.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          priority
        />
      </div>

      {/* 标签 */}
      <div className="flex flex-wrap justify-center lg:justify-start items-center gap-2 mb-4">
        {podcast.tags?.slice(0, 3).map((tag) => (
          <span
            key={tag.id}
            className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider"
          >
            {tag.name}
          </span>
        ))}
      </div>

      {/* 标题 & 作者 */}
      <h1 className="text-2xl sm:text-l lg:text-2xl font-extrabold text-base-content leading-tight mb-3 break-words tracking-tight">
        {podcast.title}
      </h1>
      <p className="text-base sm:text-lg text-base-content/60 font-medium mb-6">
        {podcast.platform || "Yuanlu Official"}
      </p>

      {/* 操作按钮 */}
      <div className="flex flex-row lg:flex-col gap-3 w-full max-w-md lg:max-w-none mb-8">
        <button
          onClick={onPlayLatest}
          className="flex-1 lg:w-full btn btn-primary rounded-2xl h-12 lg:h-[64px] lg:min-h-[64px] px-8 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all border-none"
        >
          <PlaySolidIcon className="w-6 h-6 mr-1" />
          播放最新
        </button>
        <div className="flex gap-3 flex-1 lg:w-full">
          <button
            onClick={onToggleFavorite}
            disabled={isLoadingFavorite}
            className={`flex-1 btn rounded-2xl h-12 lg:h-14 font-bold border transition-all active:scale-95 ${
              isFavorited
                ? "bg-error/10 text-error border-error/20 hover:bg-error/20"
                : "bg-base-100 text-base-content/80 border-base-200 hover:border-primary/30 hover:text-primary shadow-sm"
            }`}
          >
            {isLoadingFavorite ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : isFavorited ? (
              <HeartSolidIcon className="w-6 h-6" />
            ) : (
              <HeartIcon className="w-6 h-6" />
            )}
            <span className="hidden sm:inline lg:hidden xl:inline">
              {isFavorited ? "已收藏" : "收藏"}
            </span>
          </button>
          <button className="flex-1 btn bg-base-100 text-base-content/80 border-base-200 hover:border-primary/30 hover:text-primary rounded-2xl h-12 lg:h-14 font-bold transition-all shadow-sm active:scale-95">
            <ShareIcon className="w-6 h-6" />
            <span className="hidden sm:inline lg:hidden xl:inline">分享</span>
          </button>
        </div>
      </div>

      {/* 数据统计 */}
      <div className="hidden lg:flex items-center justify-center lg:justify-start gap-8 text-sm text-base-content/60 w-full bg-base-100/80 backdrop-blur-md p-5 rounded-3xl border border-base-200 shadow-sm">
        <div className="flex flex-col items-center lg:items-start">
          <span className="font-bold text-base-content text-xl mb-0.5">
            {(initialPlays / 1000).toFixed(1)}k
          </span>
          <span className="text-[10px] uppercase tracking-widest font-semibold">
            播放量
          </span>
        </div>
        <div className="w-px h-10 bg-base-200"></div>
        <div className="flex flex-col items-center lg:items-start">
          <span className="font-bold text-base-content text-xl mb-0.5">
            {(favoritesCount / 1000).toFixed(1)}k
          </span>
          <span className="text-[10px] uppercase tracking-widest font-semibold">
            收藏数
          </span>
        </div>
      </div>
    </div>
  );
}
