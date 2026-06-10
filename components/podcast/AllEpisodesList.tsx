"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  MusicalNoteIcon,
} from "@heroicons/react/24/outline";
import { usePlayerStore } from "@/store/player-store";
import { Episode } from "@/core/episode/episode.entity";
import EpisodeCard from "./EpisodeCard";
import { useSession } from "next-auth/react";
import { checkExclusivePlay } from "@/lib/client/auth-utils";

// ---------------------- Types ----------------------
interface EpisodeItem {
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
}

interface AllEpisodesListProps {
  podcastId: string;
  podcastTitle: string;
  podcastCoverUrl: string;
  initialEpisodes: EpisodeItem[];
  total: number;
  hasMore: boolean;
}

// ---------------------- Component ----------------------

export default function AllEpisodesList({
  podcastId,
  podcastTitle,
  podcastCoverUrl,
  initialEpisodes,
  total,
  hasMore,
}: AllEpisodesListProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { playEpisode, togglePlay, currentEpisode, isPlaying } =
    usePlayerStore();

  // ---------------------- States ----------------------
  const [episodes, setEpisodes] = useState<EpisodeItem[]>(initialEpisodes);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMoreState, setHasMoreState] = useState<boolean>(hasMore);
  const [totalCount, setTotalCount] = useState<number>(total);

  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const isMounted = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // ---------------------- Debounce for Search ----------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ---------------------- Fetch Handler ----------------------
  const fetchEpisodes = async (
    targetPage: number,
    resetList: boolean = false,
  ) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/episode/list-by-podcastid?podcastId=${podcastId}&page=${targetPage}&limit=20&search=${encodeURIComponent(
          debouncedSearch,
        )}&sort=${sortOrder}`,
      );
      const json = await res.json();
      if (json.success && json.data) {
        if (resetList) {
          setEpisodes(json.data.episodes);
        } else {
          setEpisodes((prev) => [...prev, ...json.data.episodes]);
        }
        setPage(targetPage);
        setHasMoreState(json.data.hasMore);
        setTotalCount(json.data.total);
      }
    } catch (err) {
      console.error("Failed to fetch episodes", err);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------- Reset List on Search/Sort Change ----------------------
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    fetchEpisodes(1, true);
  }, [debouncedSearch, sortOrder]);

  // ---------------------- Intersection Observer for Infinite Scroll ----------------------
  useEffect(() => {
    if (!hasMoreState || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchEpisodes(page + 1, false);
        }
      },
      { threshold: 0.1 },
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [hasMoreState, loading, page, debouncedSearch, sortOrder]);

  // Map to matching state variable for visual rendering in list
  const filteredEpisodes = episodes;

  // ---------------------- Handlers ----------------------
  const handleRowClick = (episode: Episode) => {
    router.push(`/episode/${episode.episodeid}`);
  };

  const handlePlayClick = (e: React.MouseEvent, episode: Episode) => {
    e.stopPropagation();
    if (!checkExclusivePlay(episode, session)) return;
    if (currentEpisode?.episodeid === episode.episodeid) {
      togglePlay();
    } else {
      const episodeWithPodcast = {
        ...episode,
        podcastid: episode.podcastid || podcastId,
      };
      playEpisode(episodeWithPodcast as unknown as Episode);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans pb-24 relative w-full overflow-x-hidden transition-colors duration-300">
      {/* Immersive blurred background */}
      <div className="absolute top-0 left-0 w-full h-[500px] overflow-hidden -z-10 pointer-events-none">
        <Image
          src={podcastCoverUrl}
          alt="bg"
          fill
          className="object-cover opacity-20 blur-[80px] saturate-150 scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/80 to-slate-50 dark:via-slate-900/80 dark:to-slate-900"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-12 relative z-10">
        {/* Header with back button */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/podcast/${podcastId}`}
            className="flex items-center gap-2 text-base-content/60 hover:text-primary transition-colors font-medium group w-fit shrink-0"
          >
            <div className="p-1.5 rounded-full bg-slate-200 dark:bg-slate-800 group-hover:bg-primary/10 transition-colors">
              <ArrowLeftIcon className="w-4 h-4" />
            </div>
            <span className="hidden sm:inline">返回</span>
          </Link>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-base-content truncate">
              {podcastTitle}
            </h1>
            <p className="text-sm text-base-content/50 mt-0.5">
              共 {totalCount} 集
            </p>
          </div>
        </div>

        {/* Toolbar: Search + Sort */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-3 sm:p-4 dark:border-slate-800/50 mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                placeholder="搜索剧集标题或描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input input-bordered w-full pl-10 pr-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-black focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-base-content/40 hover:text-base-content hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort select */}
            <select
              className="select select-bordered rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-black focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-base-content/70 w-full sm:w-36 text-sm"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            >
              <option value="desc">最新发布</option>
              <option value="asc">最早发布</option>
            </select>
          </div>

          {/* Search result count hint */}
          {searchQuery.trim() && (
            <p className="text-xs text-base-content/50 mt-2 px-1">
              找到 {totalCount} 条结果
            </p>
          )}
        </div>

        {/* Episodes list */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] p-4 sm:p-6 lg:p-8 dark:border-slate-800/50">
          <div className="space-y-3 sm:space-y-4">
            {filteredEpisodes.length > 0 ? (
              filteredEpisodes.map((episode) => (
                <EpisodeCard
                  key={episode.episodeid}
                  episode={episode as unknown as Episode}
                  podcastCoverUrl={podcastCoverUrl}
                  isCurrentPlaying={
                    currentEpisode?.episodeid === episode.episodeid && isPlaying
                  }
                  isCurrentPaused={
                    currentEpisode?.episodeid === episode.episodeid &&
                    !isPlaying
                  }
                  activeMenuId={activeMenuId}
                  onMenuToggle={setActiveMenuId}
                  onPlayClick={handlePlayClick}
                  onRowClick={handleRowClick}
                />
              ))
            ) : (
              <div className="py-20 text-center flex flex-col items-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <MusicalNoteIcon className="w-8 h-8 text-base-content/30" />
                </div>
                {searchQuery.trim() ? (
                  <>
                    <h3 className="text-lg font-bold text-base-content">
                      没有找到相关剧集
                    </h3>
                    <p className="text-base-content/50 mt-1">
                      试试换个关键词搜索
                    </p>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="mt-4 btn btn-sm btn-primary btn-outline rounded-xl"
                    >
                      清除搜索
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-base-content">
                      暂无剧集
                    </h3>
                    <p className="text-base-content/50 mt-1">
                      该播客尚未发布任何内容
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
          {/* sentinel 放在容器内，在列表最下方 */}
          {hasMoreState && (
            <div
              ref={sentinelRef}
              className="mt-6 text-center flex justify-center items-center"
            >
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-base-content/40 py-2">
                  <span className="loading loading-spinner loading-sm text-primary"></span>
                  <span>正在加载更多...</span>
                </div>
              ) : (
                <div className="h-4 w-full" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
