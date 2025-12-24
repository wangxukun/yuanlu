"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react"; // [新增] 引入 Session
import { toast } from "sonner"; // [新增] 引入 Toast
import {
  ArrowLeftIcon,
  ShareIcon,
  EllipsisHorizontalIcon,
  MusicalNoteIcon,
  ClockIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  QueueListIcon,
  FlagIcon,
  LinkIcon,
  HeartIcon,
  ArrowPathIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import {
  PlayIcon as PlaySolidIcon,
  HeartIcon as HeartSolidIcon,
  CheckCircleIcon as CheckCircleSolidIcon,
  PauseIcon,
} from "@heroicons/react/24/solid";
import { usePlayerStore } from "@/store/player-store";
import { formatTime } from "@/lib/tools";
import { Episode } from "@/core/episode/episode.entity";
import { togglePodcastFavorite } from "@/lib/actions/favorite-actions"; // [新增] 引入 Server Action

// 在 PodcastDetail.tsx 中定义专用接口
interface PodcastDetailData {
  podcastid: string;
  title: string;
  coverUrl: string;
  coverFileName: string | null;
  platform: string | null;
  description: string | null;
  isEditorPick: boolean | null;
  totalPlays: number;
  followerCount: number;
  createAt: Date | string;
  tags: Array<{
    id: number;
    name: string;
  }>;
  isFavorited: boolean;
  podcastFavorites: undefined;
  episode: Array<{
    episodeid: string;
    title: string;
    description: string | null;
    coverUrl: string | null;
    coverFileName: string | null;
    duration: number | null;
    playCount: number;
    audioUrl: string | null;
    audioFileName: string | null;
    subtitleEnUrl: string | null;
    subtitleEnFileName: string | null;
    subtitleZhUrl: string | null;
    subtitleZhFileName: string | null;
    publishAt: Date;
    createAt: Date | null;
    status: string | null;
    isExclusive: boolean | null;
    isFavorited: boolean;
    progressSeconds: number;
    isFinished: boolean;
  }>;
}

// [新增] 定义包含进度的 Episode 接口
interface EpisodeWithProgress extends Episode {
  progressSeconds?: number;
  isFinished?: boolean;
}

export default function PodcastDetail({
  podcast,
}: {
  podcast: PodcastDetailData;
}) {
  const router = useRouter();
  const { data: session } = useSession(); // [新增] 获取 Session
  const { playEpisode, togglePlay, currentEpisode, isPlaying } =
    usePlayerStore();

  const initialPlays = podcast.totalPlays;
  const initialFavorites = podcast.followerCount;

  // [新增] 收藏数状态，支持乐观更新
  const [favoritesCount, setFavoritesCount] = useState(initialFavorites);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);

  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [activeEpisodeMenu, setActiveEpisodeMenu] = useState<string | null>(
    null,
  );
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const headerMenuRef = useRef<HTMLDivElement>(null);
  const episodeMenuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // [新增] 检查初始收藏状态
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (session?.user?.userid && podcast.podcastid) {
        try {
          const response = await fetch(
            `/api/podcast/favorite/find-unique?podcastid=${podcast.podcastid}&userid=${session.user.userid}`,
            { method: "GET" },
          );
          const data = await response.json();
          if (data.success) {
            setIsFavorited(true);
          }
        } catch (error) {
          console.error("Failed to check favorite status", error);
        }
      }
    };
    checkFavoriteStatus();
  }, [session, podcast.podcastid]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        headerMenuRef.current &&
        !headerMenuRef.current.contains(event.target as Node)
      ) {
        setHeaderMenuOpen(false);
      }
      if (
        activeEpisodeMenu &&
        episodeMenuRefs.current[activeEpisodeMenu] &&
        !episodeMenuRefs.current[activeEpisodeMenu]?.contains(
          event.target as Node,
        )
      ) {
        setActiveEpisodeMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeEpisodeMenu]);

  const sortedEpisodes = [...(podcast.episode || [])].sort((a, b) => {
    const dateA = new Date(a.publishAt).getTime();
    const dateB = new Date(b.publishAt).getTime();
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  const handleBack = () => {
    router.back();
  };

  const handleRowClick = (episode: Episode) => {
    router.push(`/episode/${episode.episodeid}`);
  };

  const playEpisodeWithId = (ep: Episode) => {
    const episodeWithId = {
      ...ep,
      podcastid: ep.podcastid || podcast.podcastid,
      podcast: podcast,
    };
    playEpisode(episodeWithId as unknown as Episode);
  };

  const handlePlayLatest = () => {
    if (sortedEpisodes.length > 0) {
      const latest = [...sortedEpisodes].sort(
        (a, b) =>
          new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime(),
      )[0];
      playEpisodeWithId(latest as unknown as Episode);
    }
  };

  const handlePlayClick = (e: React.MouseEvent, episode: Episode) => {
    e.stopPropagation();
    if (currentEpisode?.episodeid === episode.episodeid) {
      togglePlay();
    } else {
      playEpisodeWithId(episode as unknown as Episode);
    }
  };

  // 处理收藏逻辑
  const handleToggleFavorite = async () => {
    console.log("Toggle favorite for podcast:", podcast.podcastid);
    console.log("Session user:", session);
    if (!session?.user) {
      toast.error("请先登录后收藏");
      // 可以在这里添加跳转登录页的逻辑，例如: router.push('/login');
      return;
    }

    if (isLoadingFavorite) return;
    setIsLoadingFavorite(true);

    // 乐观更新 (Optimistic Update)
    const prevIsFavorited = isFavorited;
    const prevCount = favoritesCount;

    setIsFavorited(!prevIsFavorited);
    setFavoritesCount(prevIsFavorited ? prevCount - 1 : prevCount + 1);

    try {
      // 调用 Server Action
      const result = await togglePodcastFavorite(podcast.podcastid);

      if (!result.success) {
        // 如果失败，回滚状态
        setIsFavorited(prevIsFavorited);
        setFavoritesCount(prevCount);
        toast.error(result.message || "操作失败");
      } else {
        toast.success(result.isFavorited ? "收藏成功" : "已取消收藏");
      }
    } catch (error) {
      console.error(error);
      setIsFavorited(prevIsFavorited);
      setFavoritesCount(prevCount);
      toast.error("网络错误，请重试");
    } finally {
      setIsLoadingFavorite(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-100 font-sans">
      {/* Header Background & Nav */}
      <div className="h-64 bg-base-200 relative overflow-hidden">
        <Image
          src={podcast.coverUrl}
          alt={podcast.title}
          fill
          className="object-cover blur-2xl opacity-40 scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-base-100"></div>

        <div className="absolute top-3 w-full p-4 flex items-center justify-between z-20">
          <button
            onClick={handleBack}
            className="p-2 rounded-full bg-base-100/80 backdrop-blur shadow-sm hover:bg-base-100 transition-colors text-base-content"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>

          <div
            className="flex items-center space-x-2 relative"
            ref={headerMenuRef}
          >
            <button className="p-2 rounded-full bg-base-100/80 backdrop-blur shadow-sm hover:bg-base-100 transition-colors text-base-content">
              <ShareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
              className="p-2 rounded-full bg-base-100/80 backdrop-blur shadow-sm hover:bg-base-100 transition-colors text-base-content"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" />
            </button>

            {headerMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-base-100 rounded-xl shadow-xl border border-base-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <button className="w-full text-left px-4 py-2.5 text-sm text-base-content hover:bg-base-200 flex items-center space-x-3 transition-colors">
                  <HeartIcon className="w-4 h-4" />
                  <span>Add to Library</span>
                </button>
                <button className="w-full text-left px-4 py-2.5 text-sm text-base-content hover:bg-base-200 flex items-center space-x-3 transition-colors">
                  <LinkIcon className="w-4 h-4" />
                  <span>Copy Series Link</span>
                </button>
                <div className="h-px bg-base-200 my-1"></div>
                <button className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors">
                  <FlagIcon className="w-4 h-4" />
                  <span>Report Content</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Podcast Info Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          {/* Cover Art */}
          <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-2xl shadow-2xl overflow-hidden flex-shrink-0 border-4 border-base-100 bg-base-300 relative">
            <Image
              src={podcast.coverUrl}
              alt={podcast.title}
              fill
              className="object-cover transform hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* Text Content */}
          <div className="flex-1 space-y-4 pt-4 md:pt-8 w-full">
            {/*<div className="flex flex-wrap items-center gap-2">*/}
            {/*<span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">*/}
            {/*  {mockLevel}*/}
            {/*</span>*/}
            {/*  <span className="bg-secondary/10 text-secondary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">*/}
            {/*  {mockCategory}*/}
            {/*</span>*/}
            {/*</div>*/}
            <div className="flex flex-wrap items-center gap-2">
              {podcast.tags?.slice(0, 5).map((tag) => (
                <span
                  key={tag.id}
                  className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider"
                >
                  {tag.name}
                </span>
              ))}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-base-content leading-tight">
              {podcast.title}
            </h1>

            <div className="flex flex-wrap items-center space-x-3 gap-y-2">
              <span className="text-lg font-semibold text-base-content/80">
                By {podcast.platform || "Yuanlu Official"}
              </span>
              <div className="h-4 w-px bg-base-300 hidden sm:block"></div>
              <div className="flex items-center text-sm text-base-content/60">
                <PlayIcon className="w-4 h-4 mr-1" />
                {(initialPlays / 1).toFixed(1)}k 播放
              </div>
              <div className="h-4 w-px bg-base-300 hidden sm:block"></div>
              <div className="flex items-center text-sm text-base-content/60">
                <HeartIcon
                  className={`w-4 h-4 mr-1 ${isFavorited ? "fill-red-500 text-red-500" : ""}`}
                />
                {/* [修改] 使用实时更新的 favoritesCount */}
                {(favoritesCount / 1).toFixed(1)}k 收藏
              </div>
            </div>

            <p className="text-base-content/70 max-w-2xl leading-relaxed">
              {podcast.description || "No description available."}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={handlePlayLatest}
                className="bg-primary text-primary-content px-8 py-3.5 rounded-full font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all flex items-center transform active:scale-95 group border-none"
              >
                <PlaySolidIcon className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                播放最新剧集
              </button>
              <button
                onClick={handleToggleFavorite} // [修改] 绑定新的处理函数
                disabled={isLoadingFavorite} // [新增] 防止重复点击
                className={`px-8 py-3.5 rounded-full font-bold transition-all flex items-center border-2 ${
                  isFavorited
                    ? "bg-red-50 border-red-100 text-red-600 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400"
                    : "bg-base-100 border-base-200 text-base-content/70 hover:border-red-200 hover:text-red-500 dark:hover:border-red-900/50"
                } ${isLoadingFavorite ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {/* 加载中状态显示 */}
                {isLoadingFavorite ? (
                  <span className="loading loading-spinner loading-xs mr-2"></span>
                ) : isFavorited ? (
                  <HeartSolidIcon className="w-5 h-5 mr-2" />
                ) : (
                  <HeartIcon className="w-5 h-5 mr-2" />
                )}
                {isFavorited ? "已收藏" : "收藏"}
              </button>
            </div>
          </div>
        </div>

        {/* Episodes Section */}
        <div className="mt-16 mb-20">
          <div className="flex items-center justify-between border-b border-base-200 pb-4 mb-6">
            <h2 className="text-2xl font-bold text-base-content">
              剧集
              <span className="ml-2 text-base-content/40 font-medium text-lg">
                ({podcast.episode?.length || 0})
              </span>
            </h2>
            <div className="flex items-center space-x-2">
              <select
                className="select select-ghost select-sm text-sm font-semibold text-base-content/60 outline-none cursor-pointer focus:bg-base-200"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              >
                <option value="desc">最近发布</option>
                <option value="asc">最早发布</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {sortedEpisodes.length > 0 ? (
              sortedEpisodes.map((ep) => {
                // 使用类型断言访问扩展字段
                const episode = ep as unknown as EpisodeWithProgress;
                // 计算真实进度百分比
                const progressSeconds = episode.progressSeconds || 0;
                const isFinished = episode.isFinished || false;
                const duration = episode.duration || 0;

                let progressPercentage = 0;
                if (isFinished) {
                  progressPercentage = 100;
                } else if (duration > 0) {
                  progressPercentage = Math.min(
                    (progressSeconds / duration) * 100,
                    100,
                  );
                }

                // const hasProgress = getStableBoolean(
                //     episode.episodeid + "prog",
                //     0.4,
                // );
                // const isFinished = getStableBoolean(
                //     episode.episodeid + "fin",
                //     0.1,
                // );
                // const mockProgress = isFinished
                //     ? 100
                //     : hasProgress
                //         ? getStableNumber(episode.episodeid + "pct", 10, 90)
                //         : 0;

                const isCurrentPlaying =
                  currentEpisode?.episodeid === episode.episodeid && isPlaying;
                const isCurrentPaused =
                  currentEpisode?.episodeid === episode.episodeid && !isPlaying;

                return (
                  <div
                    key={episode.episodeid}
                    className={`group flex items-center p-4 rounded-xl border border-transparent hover:border-base-300 hover:bg-base-200/50 transition-all cursor-pointer relative ${isCurrentPlaying || isCurrentPaused ? "bg-base-200/50 border-primary/20" : ""}`}
                    onClick={() => handleRowClick(episode)}
                  >
                    {/* Status Indicator (Left Play Button) */}
                    <div
                      className="w-10 flex-shrink-0 flex items-center justify-center relative z-10 hover:scale-110 transition-transform"
                      onClick={(e) => handlePlayClick(e, episode)}
                    >
                      {/* 只有当明确标记为已听完时才显示绿勾 */}
                      {isFinished ? (
                        <CheckCircleSolidIcon className="w-8 h-8 text-green-500" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-content transition-colors">
                          {isCurrentPlaying ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                              <PauseIcon className="w-5 h-5 hidden group-hover:block" />
                              <span className="loading loading-bars loading-xs group-hover:hidden"></span>
                            </div>
                          ) : (
                            <PlaySolidIcon className="w-5 h-5 ml-0.5" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Episode Info */}
                    <div className="ml-6 flex-1 min-w-0">
                      <h3
                        className={`text-base font-bold truncate transition-colors ${isCurrentPlaying ? "text-primary" : "text-base-content group-hover:text-primary"}`}
                      >
                        {episode.title}
                      </h3>
                      <div className="flex items-center mt-1 space-x-4 text-sm text-base-content/60">
                        <div className="flex items-center">
                          <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                          {new Date(episode.publishAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="w-3.5 h-3.5 mr-1" />
                          {formatTime(episode.duration)}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {progressPercentage > 0 && progressPercentage < 100 && (
                      <div className="hidden sm:block w-32 ml-4">
                        <div className="flex justify-between text-[10px] font-bold text-base-content/40 mb-1">
                          <span>In Progress</span>
                          <span>{Math.round(progressPercentage)}%</span>
                        </div>
                        <div className="h-1 w-full bg-base-300 rounded-full">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Actions Dropdown */}
                    <div
                      className="ml-4 relative"
                      ref={(el) => {
                        episodeMenuRefs.current[episode.episodeid] = el;
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() =>
                          setActiveEpisodeMenu(
                            activeEpisodeMenu === episode.episodeid
                              ? null
                              : episode.episodeid,
                          )
                        }
                        className="p-2 text-base-content/40 hover:text-base-content rounded-lg hover:bg-base-300 transition-colors"
                      >
                        <EllipsisHorizontalIcon className="w-5 h-5" />
                      </button>

                      {activeEpisodeMenu === episode.episodeid && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-base-100 rounded-xl shadow-xl border border-base-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                          <button className="w-full text-left px-4 py-2 text-sm text-base-content hover:bg-base-200 flex items-center space-x-3 transition-colors">
                            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-base-content hover:bg-base-200 flex items-center space-x-3 transition-colors">
                            <QueueListIcon className="w-3.5 h-3.5" />
                            <span>Add to Queue</span>
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-base-content hover:bg-base-200 flex items-center space-x-3 transition-colors">
                            <ArrowPathIcon className="w-3.5 h-3.5" />
                            <span>Mark as Played</span>
                          </button>
                          <div className="h-px bg-base-200 my-1"></div>
                          <button className="w-full text-left px-4 py-2 text-sm text-base-content hover:bg-base-200 flex items-center space-x-3 transition-colors">
                            <ShareIcon className="w-3.5 h-3.5" />
                            <span>Share</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 text-center bg-base-200/30 rounded-3xl border border-base-200 dashed">
                <div className="bg-base-100 inline-block p-4 rounded-full mb-4 shadow-sm">
                  <MusicalNoteIcon className="w-8 h-8 text-base-content/20" />
                </div>
                <h3 className="text-base-content font-bold">No episodes yet</h3>
                <p className="text-base-content/60 mt-1">
                  This series hasn&apos;t published any episodes yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
