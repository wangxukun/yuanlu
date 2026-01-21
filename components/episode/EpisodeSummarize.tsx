"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Heart,
  Bookmark,
  Share2,
  Download,
  Calendar,
  Clock,
  Tag,
  Tv,
  Mic,
} from "lucide-react";
import { Episode } from "@/core/episode/episode.entity";
import { useSession } from "next-auth/react";
import { usePlayerStore } from "@/store/player-store";
import Link from "next/link";
import { toggleEpisodeFavorite } from "@/lib/actions/favorite-actions";
import { toast } from "sonner";

export default function EpisodeSummarize({ episode }: { episode: Episode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const {
    play,
    togglePlay,
    isPlaying,
    currentEpisode,
    setCurrentEpisode,
    setCurrentAudioUrl,
  } = usePlayerStore();

  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);

  const isCurrentEpisode = currentEpisode?.episodeid === episode.episodeid;
  const isPlayingThis = isCurrentEpisode && isPlaying;

  const router = useRouter();
  const safeId = episode.episodeid;

  // 1. 初始化检查收藏状态
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (session?.user?.userid && episode.episodeid) {
        try {
          const response = await fetch(
            `/api/episode/favorite/find-unique?episodeid=${episode.episodeid}&userid=${session.user.userid}`,
            { method: "GET" },
          );
          const data = await response.json();
          if (data.success) {
            setIsFavorited(true);
          }
        } catch (error) {
          console.error("Failed to check episode favorite status", error);
        }
      }
    };
    checkFavoriteStatus();
  }, [session, episode.episodeid]);

  // 2. 处理收藏/取消收藏 (乐观更新)
  const handleToggleFavorite = async (e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (!session?.user) {
      toast.error("请先登录后收藏");
      return;
    }

    if (isLoadingFavorite) return;
    setIsLoadingFavorite(true);

    const prevIsFavorited = isFavorited;
    setIsFavorited(!prevIsFavorited);

    try {
      const result = await toggleEpisodeFavorite(episode.episodeid, pathname);

      if (!result.success) {
        setIsFavorited(prevIsFavorited);
        toast.error(result.message || "操作失败");
      } else {
        toast.success(result.isFavorited ? "收藏成功" : "已取消收藏");
      }
    } catch (error) {
      console.error(error);
      setIsFavorited(prevIsFavorited);
      toast.error("网络错误，请重试");
    } finally {
      setIsLoadingFavorite(false);
    }
  };

  const handleFeatureUnderDev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    toast.info("功能开发中...");
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCurrentEpisode) {
      togglePlay();
    } else {
      setCurrentEpisode(episode);
      setCurrentAudioUrl(episode.audioUrl);
      play();
    }
  };

  const handleStartPractice = () => {
    if (!safeId) return;
    router.push(`/episode/${safeId}/practice`);
  };

  return (
    // Layout Logic Fix for Dark Mode:
    // Mobile/Tablet: bg-white -> dark:bg-slate-900 (Deep card background)
    // Desktop: transparent (retains original logic)
    // Border colors adjusted for dark mode separation
    <div className="flex flex-col md:flex-row xl:flex-col gap-6 md:gap-8 bg-white dark:bg-slate-900 xl:bg-transparent xl:dark:bg-transparent p-4 md:p-6 xl:p-0 rounded-3xl xl:rounded-none shadow-sm xl:shadow-none border border-slate-100 dark:border-slate-800 xl:border-none transition-colors duration-300">
      {/* --- Cover Area --- */}
      <div className="shrink-0 w-full md:w-64 xl:w-full">
        <div className="group relative w-full aspect-[16/9] overflow-hidden rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
          <img
            src={episode.coverUrl}
            alt={episode.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Play Overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] transition-opacity duration-300
                bg-black/30 opacity-0 group-hover:opacity-100 cursor-pointer"
            onClick={handlePlay}
          >
            <button className="bg-indigo-600 text-white p-4 rounded-full shadow-2xl scale-110 hover:bg-indigo-700 transition-colors">
              {isPlayingThis ? (
                <Pause className="w-8 h-8 fill-current" />
              ) : (
                <Play className="w-8 h-8 ml-1 fill-current" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* --- Info Area --- */}
      <div className="flex flex-col justify-center flex-1 min-w-0 space-y-4">
        {/* Title & Platform */}
        <div>
          <h1 className="text-2xl font-bold leading-tight mb-3 text-slate-900 dark:text-slate-50 break-words transition-colors">
            {episode.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <Link
              href={`/podcast/${episode.podcastid}`}
              className="flex items-center gap-1.5 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md"
            >
              <Tv className="w-4 h-4" />
              {episode.podcast?.title}
            </Link>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {episode.publishAt
              ? new Date(episode.publishAt).toLocaleDateString()
              : "Unknown Date"}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {typeof episode.duration === "number"
              ? `${Math.floor(episode.duration / 60)} min`
              : episode.duration}
          </div>
        </div>

        {/* Tags */}
        {episode.tags && episode.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {episode.tags.map((tag) => (
              <span
                key={tag.id || tag.name}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 transition-colors"
              >
                <Tag className="w-3 h-3 opacity-70" />
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 md:line-clamp-4 hover:line-clamp-none transition-all cursor-pointer">
          {episode.description || "No description available."}
        </p>

        {/* Primary Action: Practice Speaking Mode */}
        <button
          onClick={handleStartPractice}
          className="group w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-2"
        >
          <Mic className="w-5 h-5 animate-pulse group-hover:animate-none" />
          <span>口语练习模式</span>
        </button>

        {/* Secondary Buttons */}
        <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            onClick={handlePlay}
          >
            {isPlayingThis ? (
              <Pause className="w-4 h-4 fill-slate-700 dark:fill-slate-200" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span className="text-xs">{isPlayingThis ? "暂停" : "播放"}</span>
          </button>

          <button
            onClick={handleToggleFavorite}
            disabled={isLoadingFavorite}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors border ${
              isFavorited
                ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400"
                : "text-slate-600 dark:text-slate-300 border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            {isFavorited ? (
              <Bookmark className="w-4 h-4 fill-current" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
            <span className="text-xs">{isFavorited ? "收藏" : "收藏"}</span>
          </button>

          <button
            onClick={handleFeatureUnderDev}
            className="flex items-center justify-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            <Heart className="w-4 h-4" />
            <span className="text-xs">点赞</span>
          </button>

          <button
            onClick={handleFeatureUnderDev}
            className="flex items-center justify-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-xs">分享</span>
          </button>
        </div>

        {/* Download */}
        <button
          onClick={handleFeatureUnderDev}
          className="flex items-center justify-center w-full gap-2 px-4 py-2 mt-2 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          下载PDF资料
        </button>
      </div>
    </div>
  );
}
