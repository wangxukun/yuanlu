"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Podcast } from "@/core/podcast/podcast.entity";
import { Episode } from "@/core/episode/episode.entity";
import { usePlayerStore } from "@/store/player-store";
import { toast } from "sonner";
import { PlusIcon, TvIcon } from "@heroicons/react/24/outline";

export default function RelatedEpisodes({
  podcast,
  currentId,
}: {
  podcast?: Podcast;
  currentId: string;
}) {
  const router = useRouter();
  const { addToPlaylist } = usePlayerStore();

  if (!podcast || !podcast.episode || podcast.episode.length <= 1) return null;

  const otherEpisodes = podcast.episode
    .filter((ep) => ep.episodeid !== currentId)
    .slice(0, 5);

  const handleAdd = (e: React.MouseEvent, ep: Episode) => {
    e.preventDefault(); // prevent Link navigation
    const enrichedEp = {
      ...ep,
      podcast: ep.podcast || { title: podcast?.title },
    };
    addToPlaylist(enrichedEp);
    toast.success("已加入播放列表");
  };

  const handleViewMore = (e: React.MouseEvent) => {
    e.preventDefault();
    if (podcast) {
      router.push(`/podcast/${podcast.podcastid}`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">
        相关剧集
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-6">
        {otherEpisodes.map((ep, index) => (
          <Link
            key={ep.episodeid}
            href={`/episode/${ep.episodeid}`}
            className="flex gap-4 group cursor-pointer relative"
          >
            <div className="w-28 shrink-0 aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
              <img
                src={ep.coverUrl}
                alt={ep.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col justify-center min-w-0 pr-8">
              <span className="text-[10px] text-[#5830E0] font-bold mb-0.5 uppercase tracking-widest">
                EPISODE {index + 1}
              </span>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#5830E0] transition-colors line-clamp-2 leading-tight">
                {ep.title}
              </h4>
              <div className="flex items-center gap-1 mt-1 text-slate-400">
                <TvIcon className="w-3 h-3" />
                <span className="text-[11px] font-medium truncate">
                  {podcast?.title || "远路英语"}
                </span>
              </div>
            </div>
            <button
              onClick={(e) => handleAdd(e, ep)}
              className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-[#5830E0] transition-all rounded-full hover:bg-[#5830E0]/5"
              title="加入播放列表"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </Link>
        ))}
      </div>

      {/* View More Button */}
      <button
        onClick={handleViewMore}
        className="w-full py-3 mt-2 text-sm font-bold text-[#5830E0] bg-[#5830E0]/5 hover:bg-[#5830E0]/10 rounded-xl transition-all uppercase tracking-widest border border-[#5830E0]/10"
      >
        查看更多内容
      </button>
    </div>
  );
}
