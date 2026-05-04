import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Bookmark, Share2, Tv, Headphones } from "lucide-react";

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
  isFavorited,
  isLoadingFavorite,
  onPlayLatest,
  onToggleFavorite,
}: PodcastHeroProps) {
  return (
    <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 lg:sticky lg:top-28 flex flex-col items-center lg:items-start text-center lg:text-left z-20">
      {/* 封面 */}
      <div className="relative w-full aspect-[16/9] md:aspect-[16/9] lg:aspect-square overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md mb-6 lg:mb-8 group">
        <Image
          src={podcast.coverUrl}
          alt={podcast.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          priority
        />
      </div>

      {/* 标签 & 播放量 */}
      <div className="flex flex-wrap justify-center lg:justify-start items-center gap-3 mb-4 w-full">
        {podcast.tags?.slice(0, 3).map((tag) => (
          <span
            key={tag.id}
            className="bg-[#5830E0]/5 text-[#5830E0] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
          >
            {tag.name}
          </span>
        ))}
        {/* 播放量 */}
        <span className="text-sm text-slate-500 flex items-center gap-1.5 font-medium ml-auto lg:ml-0">
          <Headphones className="w-4 h-4" />
          {initialPlays >= 1000
            ? `${(initialPlays / 1000).toFixed(1)}k`
            : initialPlays}
        </span>
      </div>

      {/* 标题 & 作者 */}
      <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-50 leading-tight mb-2">
        {podcast.title}
      </h1>

      <div className="mb-6">
        {podcast.platform ? (
          <Link
            href={`/channel/${encodeURIComponent(podcast.platform)}`}
            className="text-[#5830E0] font-bold text-lg hover:underline transition-all flex items-center justify-center lg:justify-start gap-2"
          >
            <Tv className="w-5 h-5" />
            {podcast.platform}
          </Link>
        ) : (
          <span className="text-[#5830E0] font-bold text-lg flex items-center justify-center lg:justify-start gap-2">
            <Tv className="w-5 h-5" />
            Yuanlu Official
          </span>
        )}
      </div>

      {/* 操作按钮 (同一行) */}
      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 py-4 border-y border-slate-100 dark:border-slate-800 w-full">
        <button
          onClick={onPlayLatest}
          className="bg-[#5830E0] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold hover:bg-[#470fd0] transition-colors"
        >
          <Play className="w-5 h-5 fill-current ml-0.5" />
          <span>播放最新</span>
        </button>

        <div className="flex items-center gap-4 ml-2 lg:ml-0">
          <button
            onClick={onToggleFavorite}
            disabled={isLoadingFavorite}
            className={`flex items-center gap-1.5 font-medium transition-colors ${
              isFavorited
                ? "text-[#5830E0]"
                : "text-slate-500 hover:text-slate-700"
            } ${isLoadingFavorite ? "opacity-50 cursor-not-allowed" : ""}`}
            title="收藏"
          >
            <Bookmark
              className={`w-5 h-5 ${isFavorited ? "fill-current" : ""}`}
            />
            <span className="hidden sm:inline">收藏</span>
          </button>

          <button
            className="flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-700 transition-colors"
            title="分享"
          >
            <Share2 className="w-5 h-5" />
            <span className="hidden sm:inline">分享</span>
          </button>
        </div>
      </div>
    </div>
  );
}
