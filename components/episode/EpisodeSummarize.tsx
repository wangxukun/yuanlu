"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Bookmark,
  Share2,
  Calendar,
  Clock,
  Tv,
  Mic,
} from "lucide-react";
import { Episode } from "@/core/episode/episode.entity";
import { useSession } from "next-auth/react";
import { usePlayerStore } from "@/store/player-store";
import Link from "next/link";
import { toggleEpisodeFavorite } from "@/lib/actions/favorite-actions";
import { toast } from "sonner";
import { formatChineseDate } from "@/lib/tools";

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
    setPlaylist,
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
      if (episode.podcast?.episode) {
        const enrichedEpisodes = (episode.podcast.episode as Episode[]).map(
          (ep) => ({
            ...ep,
            podcast: ep.podcast || { title: episode.podcast?.title },
          }),
        );
        setPlaylist(enrichedEpisodes);
      } else {
        setPlaylist([episode]);
      }
      play();
    }
  };

  const handleStartPractice = () => {
    if (!safeId) return;
    router.push(`/episode/${safeId}/practice`);
  };

  return (
    <section className="flex flex-col md:flex-row gap-8 lg:gap-10 items-start">
      {/* --- Cover Image --- */}
      <div className="w-full md:w-72 shrink-0">
        <div className="group relative w-full aspect-video overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <img
            src={episode.coverUrl}
            alt={episode.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Play Overlay (Desktop Hover) */}
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            onClick={handlePlay}
          >
            <button className="bg-primary text-white p-4 rounded-full shadow-2xl scale-110">
              {isPlayingThis ? (
                <Pause className="w-8 h-8 fill-current" />
              ) : (
                <Play className="w-8 h-8 ml-1 fill-current" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* --- Content Details --- */}
      <div className="flex flex-col gap-4 flex-1 min-w-0">
        {/* Badges & Meta */}
        <div className="flex flex-wrap gap-3 items-center">
          {episode.tags && episode.tags.length > 0 && (
            <span className="badge badge-outline border-primary text-primary px-4 py-3 text-xs font-bold uppercase tracking-wider">
              {episode.tags[0].name}
            </span>
          )}
          <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <Calendar className="w-4 h-4" />
            {episode.publishAt
              ? formatChineseDate(episode.publishAt)
              : "未知日期"}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <Clock className="w-4 h-4" />
            {typeof episode.duration === "number"
              ? `${Math.floor(episode.duration / 60)}分钟`
              : episode.duration}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 leading-tight">
          {episode.title}
        </h1>

        {/* Podcast Title */}
        <Link
          href={`/podcast/${episode.podcastid}`}
          className="flex items-center gap-2 text-primary font-semibold hover:opacity-80 transition-opacity"
        >
          <Tv className="w-5 h-5" />
          <span>{episode.podcast?.title || "远路英语"}</span>
        </Link>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mt-4 max-w-md w-full">
          {/* Practice Button */}
          <button
            onClick={handleStartPractice}
            className="btn btn-outline border-primary text-primary hover:bg-primary/10 w-full rounded-xl flex items-center justify-center gap-2 font-bold"
          >
            <Mic className="w-5 h-5" />
            <span>口语练习模式</span>
          </button>

          <div className="flex items-center gap-4">
            {/* Play Button */}
            <button
              onClick={handlePlay}
              className="btn btn-primary flex-1 rounded-xl flex items-center justify-center gap-2 group shadow-lg shadow-primary/20"
            >
              {isPlayingThis ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current transition-transform group-hover:scale-110" />
              )}
              <span className="font-bold">
                {isPlayingThis ? "暂停播放" : "开始播放"}
              </span>
            </button>

            {/* Share & Bookmark */}
            <button
              onClick={handleFeatureUnderDev}
              className="btn btn-ghost btn-circle text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="分享"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleToggleFavorite}
              disabled={isLoadingFavorite}
              className={`btn btn-ghost btn-circle hover:bg-slate-100 dark:hover:bg-slate-800 ${
                isFavorited
                  ? "text-primary"
                  : "text-slate-500 dark:text-slate-400"
              }`}
              title="收藏"
            >
              {isFavorited ? (
                <Bookmark className="w-5 h-5 fill-current" />
              ) : (
                <Bookmark className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
