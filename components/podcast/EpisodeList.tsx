import React, { useState } from "react";
import { MusicalNoteIcon } from "@heroicons/react/24/outline";
import { Episode } from "@/core/episode/episode.entity";
import EpisodeCard from "./EpisodeCard";

interface EpisodeWithProgress extends Episode {
  progressSeconds?: number;
  isFinished?: boolean;
}

interface EpisodeListProps {
  episodes: EpisodeWithProgress[];
  podcastCoverUrl: string;
  currentPlayingId?: string;
  isPlaying: boolean;
  onPlayClick: (e: React.MouseEvent, episode: Episode) => void;
  onRowClick: (episode: Episode) => void;
}

export default function EpisodeList({
  episodes,
  podcastCoverUrl,
  currentPlayingId,
  isPlaying,
  onPlayClick,
  onRowClick,
}: EpisodeListProps) {
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const sortedEpisodes = [...(episodes || [])].sort((a, b) => {
    const dateA = new Date(a.publishAt).getTime();
    const dateB = new Date(b.publishAt).getTime();
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  return (
    <div className="bg-base-100/80 backdrop-blur-xl rounded-[2rem] p-4 sm:p-6 lg:p-8 shadow-sm border border-base-200/50">
      <div className="flex items-center justify-between mb-6 px-1 sm:px-2 gap-2">
        <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-base-content flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
          <span className="sm:hidden">剧集</span>
          <span className="hidden sm:inline">剧集列表</span>
          <span className="bg-primary/10 text-primary text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-bold">
            {episodes?.length || 0}
          </span>
        </h2>
        <select
          className="select select-sm select-bordered rounded-xl bg-base-100 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-base-content/70 w-32 min-w-0 text-xs sm:text-sm px-2 sm:px-3"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
        >
          <option value="desc">最新发布</option>
          <option value="asc">最早发布</option>
        </select>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {sortedEpisodes.length > 0 ? (
          sortedEpisodes.map((episode) => (
            <EpisodeCard
              key={episode.episodeid}
              episode={episode}
              podcastCoverUrl={podcastCoverUrl}
              isCurrentPlaying={
                currentPlayingId === episode.episodeid && isPlaying
              }
              isCurrentPaused={
                currentPlayingId === episode.episodeid && !isPlaying
              }
              activeMenuId={activeMenuId}
              onMenuToggle={setActiveMenuId}
              onPlayClick={onPlayClick}
              onRowClick={onRowClick}
            />
          ))
        ) : (
          <div className="py-20 text-center flex flex-col items-center border-2 border-dashed border-base-200 rounded-3xl">
            <div className="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center mb-4">
              <MusicalNoteIcon className="w-8 h-8 text-base-content/30" />
            </div>
            <h3 className="text-lg font-bold text-base-content">暂无剧集</h3>
            <p className="text-base-content/50 mt-1">该播客尚未发布任何内容</p>
          </div>
        )}
      </div>
    </div>
  );
}
