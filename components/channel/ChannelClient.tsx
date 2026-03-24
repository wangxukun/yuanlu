"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import {
  PlayIcon as PlaySolidIcon,
  PauseIcon,
} from "@heroicons/react/24/solid";
import { usePlayerStore } from "@/store/player-store";
import { formatTime } from "@/lib/tools";
import type {
  ChannelData,
  ChannelShow,
  ChannelEpisode,
} from "@/core/channel/channel.service";
import type { Episode } from "@/core/episode/episode.entity";

// ==================== Sub-components ====================

/** Top Shows horizontal scroll card */
function ShowCard({ show }: { show: ChannelShow }) {
  return (
    <Link
      href={`/podcast/${show.podcastid}`}
      className="flex-shrink-0 w-40 sm:w-44 lg:w-48 group"
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-base-200 border border-base-200/50 mb-3 shadow-sm group-hover:shadow-md transition-shadow">
        <Image
          src={show.coverUrl}
          alt={show.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <h3 className="text-sm font-bold text-base-content line-clamp-1 group-hover:text-primary transition-colors">
        {show.title}
      </h3>
      <div className="flex items-center gap-1.5 mt-1 text-xs text-base-content/50">
        {show.tags?.[0] && <span>{show.tags[0].name}</span>}
        {show.tags?.[0] && <span>·</span>}
        <span>{show.episodeCount} 集</span>
      </div>
    </Link>
  );
}

/** Top Episodes row item */
function EpisodeRow({
  episode,
  isPlaying,
  isCurrentEpisode,
  onPlayClick,
}: {
  episode: ChannelEpisode;
  isPlaying: boolean;
  isCurrentEpisode: boolean;
  onPlayClick: (e: React.MouseEvent) => void;
}) {
  const router = useRouter();
  const displayCover =
    episode.coverUrl || episode.podcast?.coverUrl || "/placeholder.png";

  return (
    <div
      className={`group flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
        isCurrentEpisode
          ? "bg-primary/5 border-primary/30 shadow-md"
          : "bg-base-100 border-transparent hover:border-base-200 hover:bg-base-50 hover:shadow-sm"
      }`}
      onClick={() => router.push(`/episode/${episode.episodeid}`)}
    >
      {/* Cover */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden bg-base-200 border border-base-200/50">
        <Image
          src={displayCover}
          alt={episode.title}
          fill
          className="object-cover"
        />
        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={onPlayClick}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-white/90 text-primary rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"
          >
            {isCurrentEpisode && isPlaying ? (
              <PauseIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <PlaySolidIcon className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-0.5">
          {episode.podcast && (
            <span className="text-xs text-primary/80 font-semibold truncate max-w-[140px] sm:max-w-none">
              {episode.podcast.title}
            </span>
          )}
        </div>
        <h3
          className={`text-sm sm:text-base font-bold line-clamp-1 leading-tight transition-colors ${
            isCurrentEpisode
              ? "text-primary"
              : "text-base-content group-hover:text-primary"
          }`}
        >
          {episode.title}
        </h3>
        <p className="text-xs text-base-content/50 line-clamp-1 mt-1 hidden sm:block">
          {episode.description || "暂无简介"}
        </p>
        <div className="flex items-center gap-3 mt-1.5 text-[11px] font-medium text-base-content/40">
          <span className="flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" />
            {new Date(episode.publishAt).toLocaleDateString()}
          </span>
          {episode.duration ? (
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {formatTime(episode.duration)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export default function ChannelClient({ data }: { data: ChannelData }) {
  const router = useRouter();
  const { playEpisode, togglePlay, currentEpisode, isPlaying } =
    usePlayerStore();

  const handlePlayEpisode = (e: React.MouseEvent, ep: ChannelEpisode) => {
    e.stopPropagation();
    e.preventDefault();

    if (currentEpisode?.episodeid === ep.episodeid) {
      togglePlay();
    } else {
      // Build a compatible Episode object for the player
      const episodeForPlayer = {
        ...ep,
        podcast: ep.podcast || undefined,
      };
      playEpisode(episodeForPlayer as unknown as Episode);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* ========== Hero Banner ========== */}
      <div className="relative w-full bg-gradient-to-br from-emerald-800 via-teal-700 to-cyan-800 overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15)_0%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Back button */}
          <div className="pt-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors font-medium group w-fit"
            >
              <div className="p-1.5 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
                <ArrowLeftIcon className="w-4 h-4" />
              </div>
              返回
            </button>
          </div>

          {/* Banner content */}
          <div className="flex flex-col items-center py-12 sm:py-16 lg:py-20 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-3">
              {data.platformName}
            </h1>
            <p className="text-white/60 text-sm sm:text-base font-medium">
              {data.platformName} · 频道 · {data.podcastCount} 档节目
            </p>
          </div>
        </div>
      </div>

      {/* ========== Content ========== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-10 lg:space-y-14">
        {/* -------- Top Shows -------- */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg lg:text-xl font-bold text-base-content flex items-center gap-2">
              热门节目
              <ChevronRightIcon className="w-5 h-5 text-base-content/40" />
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
            {data.topShows.map((show) => (
              <ShowCard key={show.podcastid} show={show} />
            ))}
          </div>
        </section>

        {/* -------- Top Episodes -------- */}
        {data.topEpisodes.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg lg:text-xl font-bold text-base-content flex items-center gap-2">
                热门单集
                <ChevronRightIcon className="w-5 h-5 text-base-content/40" />
              </h2>
            </div>
            <div className="bg-base-100/80 backdrop-blur-xl rounded-[2rem] p-4 sm:p-6 lg:p-8 shadow-sm border border-base-200/50">
              <div className="space-y-3">
                {data.topEpisodes.map((episode) => (
                  <EpisodeRow
                    key={episode.episodeid}
                    episode={episode}
                    isPlaying={isPlaying}
                    isCurrentEpisode={
                      currentEpisode?.episodeid === episode.episodeid
                    }
                    onPlayClick={(e) => handlePlayEpisode(e, episode)}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
