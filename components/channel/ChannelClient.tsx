"use client";

import React from "react";
import ProBadge from "@/components/ui/ProBadge";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ClockIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import {
  PlayIcon as PlaySolidIcon,
  PauseIcon,
  LockClosedIcon as LockClosedSolidIcon,
} from "@heroicons/react/24/solid";
import { Radio } from "lucide-react";
import { usePlayerStore } from "@/store/player-store";
import { formatTime, formatDate } from "@/lib/tools";
import type {
  ChannelData,
  ChannelShow,
  ChannelEpisode,
} from "@/core/channel/channel.service";
import type { Episode } from "@/core/episode/episode.entity";
import { useSession } from "next-auth/react";
import { checkExclusivePlay } from "@/lib/client/auth-utils";

// ==================== Sub-components ====================

/** Top Shows horizontal scroll card */
function ShowCard({ show, index }: { show: ChannelShow; index?: number }) {
  const rankColors = [
    "bg-[#FFD700] text-white", // 01 Gold
    "bg-[#C0C0C0] text-white", // 02 Silver
    "bg-[#CD7F32] text-white", // 03 Bronze
    "bg-[#666666] text-white", // 04 iron
  ];

  return (
    <Link
      href={`/podcast/${show.podcastid}`}
      className="flex-none w-40 sm:w-44 lg:w-auto lg:flex-initial group"
    >
      <div className="relative rounded-lg transition-shadow cursor-pointer">
        {index !== undefined && (
          <div
            className={`absolute top-2 left-2 z-10 ${
              index < 4 ? rankColors[index] : "bg-base-300 text-base-content"
            } w-8 h-8 rounded-full flex items-center justify-center font-black text-sm italic shadow-sm`}
          >
            0{index + 1}
          </div>
        )}
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-base-200 border border-base-200/50 mb-3 shadow-sm group-hover:shadow-md">
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
      </div>
    </Link>
  );
}

/** Top Episodes row item */
function EpisodeRow({
  episode,
  isPlaying,
  isCurrentEpisode,
  isLocked,
  onPlayClick,
}: {
  episode: ChannelEpisode;
  isPlaying: boolean;
  isCurrentEpisode: boolean;
  isLocked: boolean;
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
      <div className="relative w-40 aspect-video md:w-48 md:aspect-video shrink-0 rounded-xl overflow-hidden bg-base-200 border border-base-200/50">
        <Image
          src={displayCover}
          alt={episode.title}
          fill
          className="object-cover"
        />
        {episode.isExclusive && (
          <div className="absolute top-2 left-2 z-10 flex gap-1.5 items-center">
            <ProBadge size="sm" />
          </div>
        )}
        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={onPlayClick}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-white/90 text-primary rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"
          >
            {isCurrentEpisode && isPlaying ? (
              <PauseIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : isLocked ? (
              <LockClosedSolidIcon className="w-4 h-4 sm:w-5 sm:h-5" />
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
            {formatDate(episode.publishAt)}
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
  const { data: session } = useSession();
  const { playEpisode, togglePlay, currentEpisode, isPlaying } =
    usePlayerStore();

  const handlePlayEpisode = (e: React.MouseEvent, ep: ChannelEpisode) => {
    e.stopPropagation();
    e.preventDefault();

    if (!checkExclusivePlay(ep, session)) return;

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
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950 pb-24">
      {/* ========== Hero Banner ========== */}
      <div className="bg-primary text-neutral-content pt-20 pb-10 md:pt-8 md:pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-10 -translate-y-10 pointer-events-none">
          <Radio size={400} className="fill-current" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center text-neutral-content/60 hover:text-neutral-content transition-colors mb-6 md:mb-8 group"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" /> 返回
          </button>

          {/* Banner content */}
          <div className="flex flex-col items-center py-12 sm:py-16 lg:py-20 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-3">
              {data.platformName}
            </h1>
            <p className="text-neutral-content/60 text-sm sm:text-base font-medium">
              {data.platformName} · 频道 · {data.podcastCount} 档节目
            </p>
          </div>
        </div>
      </div>

      {/* ========== Content ========== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-10 lg:space-y-14">
        {/* -------- Top Shows -------- */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-base-content">热门节目</h2>
            <Link
              href={`/channel/${encodeURIComponent(data.platformName)}/trending`}
              className="text-primary text-sm font-semibold hover:underline"
            >
              查看更多
            </Link>
          </div>
          <div className="flex lg:grid lg:grid-cols-4 gap-4 lg:gap-6 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-none">
            {data.topShows.slice(0, 4).map((show, index) => (
              <ShowCard key={show.podcastid} show={show} index={index} />
            ))}
          </div>
        </section>

        {/* -------- Top Episodes -------- */}
        {data.topEpisodes.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold text-base-content">热门单集</h2>
            </div>
            <div className="bg-base-100/80 backdrop-blur-xl rounded-[2rem] p-0 sm:p-0 lg:p-0">
              <div className="space-y-3">
                {data.topEpisodes.map((episode) => {
                  const isLocked =
                    episode.isExclusive &&
                    (!session?.user ||
                      (session.user.role !== "PREMIUM" &&
                        session.user.role !== "ADMIN"));
                  return (
                    <EpisodeRow
                      key={episode.episodeid}
                      episode={episode}
                      isPlaying={isPlaying}
                      isCurrentEpisode={
                        currentEpisode?.episodeid === episode.episodeid
                      }
                      isLocked={!!isLocked}
                      onPlayClick={(e) => handlePlayEpisode(e, episode)}
                    />
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
