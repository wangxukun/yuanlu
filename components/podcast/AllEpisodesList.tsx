"use client";

import React, { useState, useMemo } from "react";
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
  episodes: EpisodeItem[];
}

// ---------------------- Component ----------------------

export default function AllEpisodesList({
  podcastId,
  podcastTitle,
  podcastCoverUrl,
  episodes,
}: AllEpisodesListProps) {
  const router = useRouter();
  const { playEpisode, togglePlay, currentEpisode, isPlaying } =
    usePlayerStore();

  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Filtered + sorted episodes
  const filteredEpisodes = useMemo(() => {
    let result = [...(episodes || [])];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(
        (ep) =>
          ep.title.toLowerCase().includes(query) ||
          (ep.description && ep.description.toLowerCase().includes(query)),
      );
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.publishAt).getTime();
      const dateB = new Date(b.publishAt).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [episodes, searchQuery, sortOrder]);

  // ---------------------- Handlers ----------------------
  const handleRowClick = (episode: Episode) => {
    router.push(`/episode/${episode.episodeid}`);
  };

  const handlePlayClick = (e: React.MouseEvent, episode: Episode) => {
    e.stopPropagation();
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
    <div className="min-h-screen bg-base-100 font-sans pb-24 relative w-full overflow-x-hidden">
      {/* Immersive blurred background */}
      <div className="absolute top-0 left-0 w-full h-[400px] overflow-hidden -z-10 pointer-events-none">
        <Image
          src={podcastCoverUrl}
          alt="bg"
          fill
          className="object-cover opacity-20 blur-[80px] saturate-150 scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-base-100/80 to-base-100"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-12 relative z-10">
        {/* Header with back button */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/podcast/${podcastId}`}
            className="flex items-center gap-2 text-base-content/60 hover:text-primary transition-colors font-medium group w-fit shrink-0"
          >
            <div className="p-1.5 rounded-full bg-base-200 group-hover:bg-primary/10 transition-colors">
              <ArrowLeftIcon className="w-4 h-4" />
            </div>
            <span className="hidden sm:inline">返回</span>
          </Link>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-base-content truncate">
              {podcastTitle}
            </h1>
            <p className="text-sm text-base-content/50 mt-0.5">
              共 {episodes?.length || 0} 集
            </p>
          </div>
        </div>

        {/* Toolbar: Search + Sort */}
        <div className="bg-base-100/80 backdrop-blur-xl rounded-2xl p-3 sm:p-4 shadow-sm border border-base-200/50 mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                placeholder="搜索剧集标题或描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input input-bordered w-full pl-10 pr-10 rounded-xl bg-base-100 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-base-content/40 hover:text-base-content hover:bg-base-200 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort select */}
            <select
              className="select select-bordered rounded-xl bg-base-100 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-base-content/70 w-full sm:w-36 text-sm"
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
              找到 {filteredEpisodes.length} 条结果
            </p>
          )}
        </div>

        {/* Episodes list */}
        <div className="bg-base-100/80 backdrop-blur-xl rounded-[2rem] p-4 sm:p-6 lg:p-8 shadow-sm border border-base-200/50">
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
              <div className="py-20 text-center flex flex-col items-center border-2 border-dashed border-base-200 rounded-3xl">
                <div className="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center mb-4">
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
        </div>
      </div>
    </div>
  );
}
