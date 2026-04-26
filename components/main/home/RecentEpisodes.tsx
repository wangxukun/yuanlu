import React from "react";
import Image from "next/image";
import { PlayIcon } from "@heroicons/react/24/solid";
import { ClockIcon as ClockOutlineIcon } from "@heroicons/react/24/outline";
import { Headphones } from "lucide-react";
import { RecommendedEpisodeDto } from "@/core/episode/dto/recommended-episode.dto";
import HorizontalScrollContainer from "@/components/discover/HorizontalScrollContainer";

interface RecentEpisodesProps {
  episodes: RecommendedEpisodeDto[];
  onPlay: (id: string) => void;
}

export default function RecentEpisodes({
  episodes,
  onPlay,
}: RecentEpisodesProps) {
  if (!episodes || episodes.length === 0) return null;
  return (
    <HorizontalScrollContainer title="最新发布">
      {episodes.map((episode) => {
        const diffLevel = episode.difficulty || "General";
        let diffColor = "text-gray-700";
        if (diffLevel.includes("A")) diffColor = "text-emerald-600";
        else if (diffLevel.includes("B1")) diffColor = "text-blue-600";
        else if (diffLevel.includes("B2")) diffColor = "text-purple-600";
        else if (diffLevel.includes("C")) diffColor = "text-rose-600";

        return (
          <div
            key={episode.id}
            onClick={() => onPlay(episode.id)}
            className="flex-none w-64 bg-white dark:bg-slate-900 rounded-lg hover:scale-[1.02] transition-all duration-300 group overflow-hidden cursor-pointer"
          >
            {/* Cover image */}
            <figure className="relative aspect-[16/9] overflow-hidden">
              <Image
                src={episode.coverUrl || "/static/images/default_cover_url.png"}
                alt={episode.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* PRO and Play count badges (top left) */}
              <div className="absolute top-2 left-2 z-10 flex gap-1.5 items-center">
                {episode.isExclusive && (
                  <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-1.5 py-0.5 rounded font-extrabold text-[10px] tracking-widest flex items-center">
                    👑 PRO
                  </div>
                )}
                {episode.playCount !== undefined && (
                  <div className="bg-[rgba(20,20,30,0.8)] text-white backdrop-blur-md px-1.5 py-0.5 rounded text-[11px] font-medium flex items-center tracking-wide">
                    <Headphones className="w-3 h-3 mr-1 opacity-80" />
                    {episode.playCount.toLocaleString()}
                  </div>
                )}
              </div>
              {/* Difficulty badge (top right) */}
              <div className="absolute top-2 right-2 z-10">
                <div
                  className={`bg-white/95 px-2 py-0.5 rounded font-extrabold text-sm tracking-wide ${diffColor}`}
                >
                  {diffLevel}
                </div>
              </div>
              {/* Category badge (bottom left) */}
              {episode.category && (
                <div className="absolute bottom-2 left-2 z-10">
                  <div className="bg-rose-100/95 text-rose-700 px-2 py-0.5 rounded font-bold text-xs flex items-center">
                    <PlayIcon className="w-3 h-3 mr-1" />
                    {episode.category}
                  </div>
                </div>
              )}
              {/* Duration badge (bottom right) */}
              <div className="absolute bottom-2 right-2 z-10">
                <div className="bg-black/70 text-white backdrop-blur-sm px-2 py-0.5 rounded text-xs font-medium flex items-center">
                  <ClockOutlineIcon className="w-3 h-3 mr-1" />
                  {episode.duration}
                </div>
              </div>
              {/* Play overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-content flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300">
                  <PlayIcon className="w-5 h-5 ml-0.5" />
                </div>
              </div>
            </figure>
            {/* Card body */}
            <div className="p-3 xl:p-4 pointer-events-none">
              <h3 className="text-sm xl:text-base font-bold text-base-content line-clamp-1 group-hover:text-primary transition-colors">
                {episode.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-base-content/50 truncate w-full mt-1">
                <span className="truncate">{episode.podcastTitle}</span>
              </div>
            </div>
          </div>
        );
      })}
    </HorizontalScrollContainer>
  );
}
