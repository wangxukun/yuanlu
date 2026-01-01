"use client";

import { Episode } from "@/core/episode/episode.entity";
import {
  PlayIcon,
  PauseIcon,
  HeartIcon as SolidHeartIcon, // 实心爱心 (已收藏)
  ShareIcon,
  CalendarDaysIcon,
  ClockIcon,
  TvIcon,
  EllipsisHorizontalIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/solid";
import {
  PlayIcon as PlayIconOutline,
  HashtagIcon,
  HeartIcon as OutlineHeartIcon, // 空心爱心 (未收藏)
} from "@heroicons/react/24/outline";
import Link from "next/link";
import Image from "next/image";
import { usePlayerStore } from "@/store/player-store";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toggleEpisodeFavorite } from "@/lib/actions/favorite-actions";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

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

  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);

  const isCurrentEpisode = currentEpisode?.episodeid === episode.episodeid;
  const isPlayingThis = isCurrentEpisode && isPlaying;

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
    e?.stopPropagation(); // 防止冒泡触发其他点击事件

    if (!session?.user) {
      toast.error("请先登录后收藏");
      return;
    }

    if (isLoadingFavorite) return;
    setIsLoadingFavorite(true);

    // 乐观更新：先切换 UI 状态
    const prevIsFavorited = isFavorited;
    setIsFavorited(!prevIsFavorited);

    try {
      const result = await toggleEpisodeFavorite(episode.episodeid, pathname);

      if (!result.success) {
        // 失败回滚
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

  // 3. 待开发功能提示
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

  const publishDate = new Date(episode.publishAt).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const durationMins = Math.floor(episode.duration / 60);

  return (
    <>
      {/* =====================================================================================
          Mobile & Tablet Layout (< xl)
      ===================================================================================== */}
      <div className="xl:hidden bg-base-100 rounded-[1.5rem] p-4 sm:p-5 shadow-sm border border-base-200/60 mb-6">
        <div className="flex gap-4 sm:gap-6">
          {/* 左侧：小封面 */}
          <div className="shrink-0 w-24 h-24 sm:w-64 sm:h-36 relative rounded-xl overflow-hidden shadow-md ring-1 ring-black/5 group">
            <Image
              src={episode.coverUrl}
              alt={episode.title}
              fill
              className="object-cover"
            />
            {/* 移动端封面点击也可播放 */}
            <div
              className="absolute inset-0 bg-black/10 flex items-center justify-center active:bg-black/30 transition-colors cursor-pointer"
              onClick={handlePlay}
            >
              {isPlayingThis && (
                <div className="loading loading-ring text-white w-8 h-8"></div>
              )}
            </div>
          </div>

          {/* 右侧：信息与操作 */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Link
                  href={`/podcast/${episode.podcastid}`}
                  className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-nowrap truncate max-w-[120px]"
                >
                  {episode.podcast?.title}
                </Link>
                <span className="text-xs text-base-content/40 font-medium truncate">
                  {publishDate}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold leading-tight text-base-content line-clamp-2">
                {episode.title}
              </h1>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handlePlay}
                className="btn btn-primary btn-sm rounded-full gap-1.5 shadow-lg shadow-primary/20 flex-1 sm:flex-none sm:px-6"
              >
                {isPlayingThis ? (
                  <PauseIcon className="w-4 h-4" />
                ) : (
                  <PlayIcon className="w-4 h-4" />
                )}
                {isPlayingThis ? "暂停" : "播放"}
              </button>

              <div className="flex gap-1">
                {/* 移动端收藏按钮 */}
                <button
                  onClick={handleToggleFavorite}
                  disabled={isLoadingFavorite}
                  className={`btn btn-sm btn-circle ${
                    isFavorited
                      ? "text-red-500 bg-red-50 hover:bg-red-100 border-red-100"
                      : "text-base-content/60 btn-ghost"
                  }`}
                  aria-label={isFavorited ? "取消收藏" : "收藏"}
                >
                  {isLoadingFavorite ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : isFavorited ? (
                    <SolidHeartIcon className="w-5 h-5" />
                  ) : (
                    <OutlineHeartIcon className="w-5 h-5" />
                  )}
                </button>
                {/* 移动端更多操作按钮 */}
                <button
                  onClick={handleFeatureUnderDev}
                  className="btn btn-ghost btn-sm btn-circle text-base-content/60"
                >
                  <EllipsisHorizontalIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 移动端简介折叠 */}
        <div
          className="mt-4 pt-3 border-t border-dashed border-base-200 text-sm text-base-content/70 leading-relaxed cursor-pointer active:opacity-70 transition-opacity"
          onClick={() => setIsDescExpanded(!isDescExpanded)}
        >
          <p className={isDescExpanded ? "" : "line-clamp-2"}>
            {episode.description || "暂无简介"}
          </p>
          {!isDescExpanded &&
            episode.description &&
            episode.description.length > 60 && (
              <div className="flex justify-center mt-1">
                <span className="text-xs text-base-content/30 bg-base-200/50 px-3 py-0.5 rounded-full">
                  展开详情
                </span>
              </div>
            )}
        </div>
      </div>

      {/* =====================================================================================
          Desktop Sidebar Layout (>= xl)
      ===================================================================================== */}
      <div className="hidden xl:flex flex-col gap-8 px-2">
        {/* 1. 封面区域 */}
        <div className="group relative aspect-[16/9] w-full rounded-[2rem] overflow-hidden shadow-2xl shadow-base-300/60 ring-1 ring-black/5 bg-base-100">
          <Image
            src={episode.coverUrl}
            alt={episode.title}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            priority
          />
          {/* 磨砂玻璃播放遮罩 */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
            <button
              onClick={handlePlay}
              className="btn btn-circle btn-xl bg-white/20 border-white/40 text-white backdrop-blur-md hover:bg-white hover:text-primary hover:border-white hover:scale-110 shadow-2xl transition-all"
            >
              {isPlayingThis ? (
                <PauseIcon className="w-10 h-10" />
              ) : (
                <PlayIcon className="w-10 h-10 ml-1" />
              )}
            </button>
          </div>
        </div>

        {/* 2. 标题与核心信息 */}
        <div className="space-y-4 text-center">
          <Link
            href={`/podcast/${episode.podcastid}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-primary uppercase bg-primary/5 hover:bg-primary/10 px-3 py-1 rounded-full transition-colors"
          >
            <TvIcon className="w-3 h-3" />
            {episode.podcast?.title}
          </Link>

          <h1 className="text-2xl font-black leading-tight text-base-content">
            {episode.title}
          </h1>

          <div className="flex items-center justify-center gap-4 text-xs font-medium text-base-content/40 uppercase tracking-widest">
            <span className="flex items-center gap-1">
              <CalendarDaysIcon className="w-3.5 h-3.5" />
              {publishDate}
            </span>
            <span className="w-1 h-1 rounded-full bg-base-300"></span>
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5" />
              {durationMins} MINS
            </span>
          </div>
        </div>

        {/* 3. 主要操作区 */}
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={handlePlay}
            className="btn btn-primary btn-lg w-full rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300"
          >
            {isPlayingThis ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>{" "}
                正在播放
              </>
            ) : (
              <>
                <PlayIconOutline className="w-6 h-6 stroke-2" /> 立即播放
              </>
            )}
          </button>

          <div className="grid grid-cols-3 gap-3">
            {/* 桌面端收藏按钮 */}
            <button
              onClick={handleToggleFavorite}
              disabled={isLoadingFavorite}
              className={`btn border-base-200 hover:border-primary/30 rounded-xl flex flex-col gap-1 h-auto py-3 text-xs font-normal transition-all ${
                isFavorited
                  ? "bg-red-50 text-red-500 border-red-100 hover:bg-red-100"
                  : "bg-base-100 text-base-content/60 hover:bg-base-100 hover:text-red-500"
              }`}
            >
              {isLoadingFavorite ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : isFavorited ? (
                <SolidHeartIcon className="w-6 h-6" />
              ) : (
                <OutlineHeartIcon className="w-6 h-6" />
              )}
              {isFavorited ? "已收藏" : "收藏"}
            </button>

            {/* 下载按钮 */}
            <button
              onClick={handleFeatureUnderDev}
              className="btn btn-ghost bg-base-100 border-base-200 hover:border-primary/30 hover:bg-base-100 rounded-xl text-base-content/60 flex flex-col gap-1 h-auto py-3 text-xs font-normal"
            >
              <ArrowDownTrayIcon className="w-6 h-6" /> 下载
            </button>

            {/* 分享按钮 */}
            <button
              onClick={handleFeatureUnderDev}
              className="btn btn-ghost bg-base-100 border-base-200 hover:border-primary/30 hover:bg-base-100 rounded-xl text-base-content/60 flex flex-col gap-1 h-auto py-3 text-xs font-normal"
            >
              <ShareIcon className="w-6 h-6" /> 分享
            </button>
          </div>
        </div>

        {/* 4. 简介 */}
        <div className="bg-white/50 p-5 rounded-2xl border border-base-200/50">
          <h3 className="text-xs font-bold text-base-content/40 uppercase mb-3 flex items-center gap-2">
            简介
            <span className="h-px flex-1 bg-base-200"></span>
          </h3>
          <p className="text-sm text-base-content/70 leading-7 text-justify whitespace-pre-line font-sans">
            {episode.description || "本集暂无文字简介。"}
          </p>
        </div>

        {/* 5. 标签 */}
        {episode.tags && episode.tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {episode.tags.map((tag) => (
              <span
                key={tag.id}
                className="badge badge-lg bg-base-100 border-base-200 text-base-content/50 gap-1 pl-1.5 pr-3 text-xs hover:border-primary/30 cursor-pointer transition-colors"
              >
                <HashtagIcon className="w-3 h-3 opacity-50" />
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
