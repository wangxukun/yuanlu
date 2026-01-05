"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
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
import { togglePodcastFavorite } from "@/lib/actions/favorite-actions";

// ---------------------- Types ----------------------
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

interface EpisodeWithProgress extends Episode {
  progressSeconds?: number;
  isFinished?: boolean;
  coverUrl: string;
  description: string;
}

// ---------------------- Component ----------------------

export default function PodcastDetail({
  podcast,
}: {
  podcast: PodcastDetailData;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { playEpisode, togglePlay, currentEpisode, isPlaying } =
    usePlayerStore();

  const initialPlays = podcast.totalPlays;
  const initialFavorites = podcast.followerCount;

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

  // ---------------------- Effects ----------------------
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

  // ---------------------- Handlers ----------------------
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

  const handleToggleFavorite = async () => {
    if (!session?.user) {
      toast.error("请先登录后收藏");
      return;
    }

    if (isLoadingFavorite) return;
    setIsLoadingFavorite(true);

    const prevIsFavorited = isFavorited;
    const prevCount = favoritesCount;

    setIsFavorited(!prevIsFavorited);
    setFavoritesCount(prevIsFavorited ? prevCount - 1 : prevCount + 1);

    try {
      const result = await togglePodcastFavorite(podcast.podcastid);

      if (!result.success) {
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
    // [Container] max-w-full overflow-x-hidden 确保根容器不溢出
    <div className="min-h-screen bg-base-100 font-sans pb-10 w-full max-w-full overflow-x-hidden">
      {/* Header Background & Nav */}
      <div className="h-48 sm:h-64 xl:h-64 bg-base-200 relative overflow-hidden transition-all duration-300 w-full">
        <Image
          src={podcast.coverUrl}
          alt={podcast.title}
          fill
          className="object-cover blur-2xl opacity-40 scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-base-100"></div>

        {/* Top Navigation Bar */}
        <div className="absolute top-0 w-full p-4 flex items-center justify-between z-20 safe-area-inset-top">
          <button
            onClick={handleBack}
            className="p-2 rounded-full bg-base-100/60 xl:bg-base-100/80 backdrop-blur shadow-sm hover:bg-base-100 transition-colors text-base-content"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>

          <div
            className="flex items-center space-x-2 relative"
            ref={headerMenuRef}
          >
            <button className="p-2 rounded-full bg-base-100/60 xl:bg-base-100/80 backdrop-blur shadow-sm hover:bg-base-100 transition-colors text-base-content">
              <ShareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
              className="p-2 rounded-full bg-base-100/60 xl:bg-base-100/80 backdrop-blur shadow-sm hover:bg-base-100 transition-colors text-base-content"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 sm:-mt-28 xl:-mt-32 relative z-10 w-full">
        <div className="flex flex-col xl:flex-row gap-6 sm:gap-8 items-center xl:items-center w-full">
          {/* Cover Art */}
          <div className="w-48 h-48 sm:w-64 sm:h-64 xl:w-64 xl:h-64 rounded-xl sm:rounded-2xl overflow-hidden flex-shrink-0 border-4 border-base-100 shadow-2xl bg-base-300 relative">
            <Image
              src={podcast.coverUrl}
              alt={podcast.title}
              fill
              className="object-cover"
            />
          </div>

          {/* Text Content */}
          <div className="flex-1 space-y-3 sm:space-y-4 w-full text-center xl:text-left min-w-0 max-w-full">
            {/* Tags */}
            <div className="flex flex-wrap justify-center xl:justify-start items-center gap-2">
              {podcast.tags?.slice(0, 5).map((tag) => (
                <span
                  key={tag.id}
                  className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider"
                >
                  {tag.name}
                </span>
              ))}
            </div>

            {/* Title - break-words + hyphens-auto 确保长单词换行 */}
            <h1 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold text-base-content leading-tight px-2 sm:px-0 break-words hyphens-auto w-full">
              {podcast.title}
            </h1>

            {/* Meta Info Row */}
            <div className="flex flex-wrap justify-center xl:justify-start items-center space-x-3 gap-y-2 text-sm sm:text-base">
              <span className="font-semibold text-base-content/80">
                By {podcast.platform || "Yuanlu Official"}
              </span>
              <div className="h-3 w-px bg-base-300"></div>
              <div className="flex items-center text-base-content/60">
                <PlayIcon className="w-3.5 h-3.5 mr-1" />
                {(initialPlays / 1).toFixed(1)}k
              </div>
              <div className="h-3 w-px bg-base-300"></div>
              <div className="flex items-center text-base-content/60">
                <HeartIcon
                  className={`w-3.5 h-3.5 mr-1 ${isFavorited ? "fill-red-500 text-red-500" : ""}`}
                />
                {(favoritesCount / 1).toFixed(1)}k
              </div>
            </div>

            {/* Description */}
            <p className="text-sm sm:text-base text-base-content/70 w-full max-w-2xl leading-relaxed mx-auto xl:mx-0 line-clamp-3 xl:line-clamp-none break-words">
              {podcast.description || "No description available."}
            </p>

            {/* Action Buttons Area: Mobile Stack / Desktop Row */}
            <div className="flex flex-col sm:flex-row items-center justify-center xl:justify-start gap-3 pt-2 w-full sm:w-auto max-w-md mx-auto xl:mx-0 px-1 sm:px-0">
              <button
                onClick={handlePlayLatest}
                className="btn btn-primary btn-md sm:btn-lg rounded-full font-bold shadow-lg shadow-primary/30 w-full sm:w-auto min-h-[3rem] h-auto py-3 px-6 border-none"
              >
                <PlaySolidIcon className="w-5 h-5 mr-1 flex-shrink-0" />
                <span className="whitespace-normal leading-tight break-words">
                  播放最新剧集
                </span>
              </button>
              <button
                onClick={handleToggleFavorite}
                disabled={isLoadingFavorite}
                className={`btn btn-md sm:btn-lg rounded-full font-bold w-full sm:w-auto min-h-[3rem] h-auto py-3 px-6 border-2 ${
                  isFavorited
                    ? "btn-error bg-red-50 border-red-100 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-900/50"
                    : "btn-outline border-base-200 text-base-content/70 hover:border-red-200 hover:text-red-500 hover:bg-base-100"
                }`}
              >
                {isLoadingFavorite ? (
                  <span className="loading loading-spinner loading-xs mr-1"></span>
                ) : isFavorited ? (
                  <HeartSolidIcon className="w-5 h-5 mr-1 flex-shrink-0" />
                ) : (
                  <HeartIcon className="w-5 h-5 mr-1 flex-shrink-0" />
                )}
                <span className="whitespace-normal leading-tight break-words">
                  {isFavorited ? "已收藏" : "收藏"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Episodes Section */}
        <div className="mt-10 sm:mt-16 mb-20 w-full">
          <div className="flex items-center justify-between border-b border-base-200 pb-3 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-base-content flex items-baseline">
              剧集
              <span className="ml-2 text-base-content/40 font-medium text-sm sm:text-lg">
                ({podcast.episode?.length || 0})
              </span>
            </h2>
            <div className="flex items-center space-x-2">
              <select
                className="select select-ghost select-sm text-xs sm:text-sm font-semibold text-base-content/60 outline-none focus:bg-base-200"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              >
                <option value="desc">最近发布</option>
                <option value="asc">最早发布</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {sortedEpisodes.length > 0 ? (
              sortedEpisodes.map((ep) => {
                const episode = ep as unknown as EpisodeWithProgress;
                const progressSeconds = episode.progressSeconds || 0;
                const isFinished = episode.isFinished || false;
                const duration = episode.duration || 0;

                const displayCover =
                  episode.coverUrl || podcast.coverUrl || "/placeholder.png";

                let progressPercentage = 0;
                if (isFinished) {
                  progressPercentage = 100;
                } else if (duration > 0) {
                  progressPercentage = Math.min(
                    (progressSeconds / duration) * 100,
                    100,
                  );
                }

                const isCurrentPlaying =
                  currentEpisode?.episodeid === episode.episodeid && isPlaying;
                const isCurrentPaused =
                  currentEpisode?.episodeid === episode.episodeid && !isPlaying;

                return (
                  <div
                    key={episode.episodeid}
                    className={`group flex items-center p-3 sm:p-4 rounded-xl border border-transparent hover:border-base-300 hover:bg-base-200/50 transition-all cursor-pointer relative ${
                      activeEpisodeMenu === episode.episodeid ? "z-20" : "z-0"
                    } ${
                      isCurrentPlaying || isCurrentPaused
                        ? "bg-base-200/50 border-primary/20"
                        : "bg-base-100/50 sm:bg-transparent"
                    }`}
                    onClick={() => handleRowClick(episode)}
                  >
                    {/* Play Status Indicator (Left) - Hidden on mobile */}
                    <div
                      className="hidden sm:flex w-10 flex-shrink-0 items-center justify-center relative z-10 hover:scale-110 transition-transform mr-4"
                      onClick={(e) => handlePlayClick(e, episode)}
                    >
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

                    {/* Episode Cover */}
                    <div className="h-14 sm:h-20 aspect-video relative flex-shrink-0 rounded-lg overflow-hidden bg-base-200 border border-base-100/50 shadow-sm group-hover:shadow-md transition-all">
                      <Image
                        src={displayCover}
                        alt={episode.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>

                    {/* Episode Info */}
                    <div className="ml-3 sm:ml-4 flex-1 min-w-0 flex flex-col justify-center w-full">
                      {/* [修改重点]:
                          1. 移除 truncate (不再单行截断)
                          2. 添加 break-words (强制换行)
                          3. 添加 line-clamp-2 (限制最多2行，防止过高)
                          4. 添加 leading-tight (多行时行距紧凑)
                      */}
                      <h3
                        className={`text-sm sm:text-base font-bold break-words line-clamp-2 leading-tight transition-colors ${isCurrentPlaying ? "text-primary" : "text-base-content group-hover:text-primary"}`}
                      >
                        {episode.title}
                      </h3>

                      <p className="hidden sm:line-clamp-1 text-sm text-base-content/60 mt-1 mb-1.5 line-clamp-2 leading-relaxed break-words">
                        {episode.description || "暂无简介"}
                      </p>

                      <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm text-base-content/50 mt-1 sm:mt-1.5">
                        <div className="flex items-center">
                          <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                          {new Date(episode.publishAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                          {formatTime(episode.duration)}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar (Desktop/Tablet Only) */}
                    {progressPercentage > 0 && progressPercentage < 100 && (
                      <div className="hidden sm:block w-24 lg:w-32 ml-4 flex-shrink-0">
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

                    {/* Actions Dropdown - Hidden on mobile */}
                    <div
                      className="hidden sm:block ml-4 relative flex-shrink-0"
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
              <div className="py-12 sm:py-20 text-center bg-base-200/30 rounded-2xl sm:rounded-3xl border border-base-200 dashed">
                <div className="bg-base-100 inline-block p-3 sm:p-4 rounded-full mb-3 sm:mb-4 shadow-sm">
                  <MusicalNoteIcon className="w-6 h-6 sm:w-8 sm:h-8 text-base-content/20" />
                </div>
                <h3 className="text-base-content font-bold">No episodes yet</h3>
                <p className="text-sm sm:text-base text-base-content/60 mt-1">
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
