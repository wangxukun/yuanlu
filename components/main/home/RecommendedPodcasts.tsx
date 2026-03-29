import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRightIcon, PlayIcon } from "@heroicons/react/24/solid";
import { ClockIcon as ClockOutlineIcon } from "@heroicons/react/24/outline";
import { Headphones } from "lucide-react";
import { RecommendedEpisodeDto } from "@/core/episode/dto/recommended-episode.dto";

interface RecommendedPodcastsProps {
  episodes: RecommendedEpisodeDto[];
  level: string;
  onPlay: (id: string) => void;
}

export default function RecommendedPodcasts({
  episodes,
  level,
  onPlay,
}: RecommendedPodcastsProps) {
  if (!episodes || episodes.length === 0) return null;
  return (
    <section>
      <div className="flex items-center justify-between mb-4 xl:mb-6">
        <div className="flex items-center space-x-2">
          <div className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5 rounded-md">
            <span className="w-5 h-5 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
              ✨
            </span>
          </div>
          <h2 className="text-lg xl:text-xl font-bold text-base-content">
            推荐给你
          </h2>
        </div>
        <Link
          href="/home/recommendations"
          className="flex items-center gap-1 text-sm font-medium text-base-content/60 hover:text-primary transition-colors cursor-pointer relative z-10"
        >
          更多
          <ChevronRightIcon className="w-4 h-4 gap-0" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 xl:gap-5">
        {episodes.map((episode) => {
          const diffLevel = episode.difficulty || level || "General";
          let diffColor = "text-gray-700";
          if (diffLevel.includes("A")) diffColor = "text-emerald-600";
          else if (diffLevel.includes("B1")) diffColor = "text-blue-600";
          else if (diffLevel.includes("B2")) diffColor = "text-purple-600";
          else if (diffLevel.includes("C")) diffColor = "text-rose-600";

          return (
            <div
              key={episode.id}
              onClick={() => onPlay(episode.id)}
              className="card bg-base-100 shadow-sm hover:shadow-lg border border-base-200 hover:border-primary/20 transition-all duration-300 group overflow-hidden cursor-pointer"
            >
              {/* Cover image */}
              <figure className="relative aspect-[16/9] overflow-hidden">
                <Image
                  src={
                    episode.coverUrl || "/static/images/default_cover_url.png"
                  }
                  alt={episode.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* PRO and Play count badges (top left) */}
                <div className="absolute top-2 left-2 z-10 flex gap-1.5 items-center">
                  {episode.isExclusive && (
                    <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-1.5 py-0.5 rounded shadow-sm font-extrabold text-[10px] tracking-widest flex items-center">
                      👑 PRO
                    </div>
                  )}
                  {episode.playCount !== undefined && (
                    <div className="bg-[rgba(20,20,30,0.8)] text-white backdrop-blur-md px-1.5 py-0.5 rounded shadow-sm text-[11px] font-medium flex items-center tracking-wide">
                      <Headphones className="w-3 h-3 mr-1 opacity-80" />
                      {episode.playCount.toLocaleString()}
                    </div>
                  )}
                </div>
                {/* Difficulty badge (top right) */}
                <div className="absolute top-2 right-2 z-10">
                  <div
                    className={`bg-white/95 px-2 py-0.5 rounded shadow-sm font-extrabold text-sm tracking-wide ${diffColor}`}
                  >
                    {diffLevel}
                  </div>
                </div>
                {/* Category badge (bottom left) */}
                {episode.category && (
                  <div className="absolute bottom-2 left-2 z-10">
                    <div className="bg-rose-100/95 text-rose-700 px-2 py-0.5 rounded shadow-sm font-bold text-xs flex items-center">
                      <PlayIcon className="w-3 h-3 mr-1" />
                      {episode.category}
                    </div>
                  </div>
                )}
                {/* Duration badge (bottom right) */}
                <div className="absolute bottom-2 right-2 z-10">
                  <div className="bg-black/70 text-white backdrop-blur-sm px-2 py-0.5 rounded shadow-sm text-xs font-medium flex items-center">
                    <ClockOutlineIcon className="w-3 h-3 mr-1" />
                    {episode.duration}
                  </div>
                </div>
                {/* Play overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-content flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 shadow-xl">
                    <PlayIcon className="w-5 h-5 ml-0.5" />
                  </div>
                </div>
              </figure>
              {/* Card body */}
              <div className="card-body p-3 xl:p-4 pointer-events-none">
                <h3 className="text-sm xl:text-base font-bold text-base-content line-clamp-1 group-hover:text-primary transition-colors">
                  {episode.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-base-content/50 truncate w-full mt-1">
                  <span className="truncate max-w-[320px] sm:max-w-[320px]">
                    {episode.podcastTitle}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
