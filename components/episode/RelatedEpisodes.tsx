"use client";

import React from "react";
import ProBadge from "@/components/ui/ProBadge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Podcast } from "@/core/podcast/podcast.entity";
import { Episode } from "@/core/episode/episode.entity";
import { usePlayerStore } from "@/store/player-store";
import { toast } from "sonner";
import { QueueListIcon, TvIcon } from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import { checkExclusivePlay } from "@/lib/client/auth-utils";

export default function RelatedEpisodes({
  podcast,
  currentId,
}: {
  podcast?: Podcast;
  currentId: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const {
    addToPlaylist,
    currentEpisode,
    setCurrentEpisode,
    setCurrentAudioUrl,
    setIsPlaying,
  } = usePlayerStore();

  if (!podcast || !podcast.episode || podcast.episode.length <= 1) return null;

  const otherEpisodes = podcast.episode
    .filter((ep) => ep.episodeid !== currentId)
    .slice(0, 5);

  const handleAdd = (e: React.MouseEvent, ep: Episode) => {
    e.preventDefault(); // prevent Link navigation
    if (!checkExclusivePlay(ep, session)) return;
    const enrichedEp = {
      ...ep,
      podcast: ep.podcast || { title: podcast?.title },
    };
    addToPlaylist(enrichedEp);

    // 如果当前没有剧集在播放器中，则设置当前剧集以显示 PlayControlBar
    if (!currentEpisode) {
      setCurrentEpisode(enrichedEp);
      setCurrentAudioUrl(enrichedEp.audioUrl || "");
      setIsPlaying(false);
    }

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
      <h3 className="text-xl font-bold text-ink-900 dark:text-ink-50">
        相关剧集
      </h3>
      <div className="grid grid-cols-1 gap-6">
        {otherEpisodes.map((ep, index) => (
          <Link
            key={ep.episodeid}
            href={`/episode/${ep.episodeid}`}
            className="flex gap-4 group cursor-pointer relative"
          >
            <div className="relative w-28 shrink-0 aspect-video rounded-xl overflow-hidden bg-ink-100 dark:bg-ink-800 border border-ink-100 dark:border-ink-800">
              <img
                src={ep.coverUrl}
                alt={ep.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              {ep.isExclusive && (
                <div className="absolute top-1.5 left-1.5 z-10 flex items-center">
                  <ProBadge size="sm" />
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center min-w-0 pr-8">
              <span className="text-[10px] text-[#1F7A5C] font-bold mb-0.5 uppercase tracking-widest">
                EPISODE {index + 1}
              </span>
              <h4 className="text-sm font-semibold text-ink-800 dark:text-ink-200 group-hover:text-[#1F7A5C] transition-colors line-clamp-2 leading-tight">
                {ep.title}
              </h4>
              <div className="flex items-center gap-1 mt-1 text-ink-400">
                <TvIcon className="w-3 h-3" />
                <span className="text-[11px] font-medium truncate">
                  {podcast?.title || "远路英语"}
                </span>
              </div>
            </div>
            <button
              onClick={(e) => handleAdd(e, ep)}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-ink-400 hover:text-[#1F7A5C] transition-all rounded-full hover:bg-[#1F7A5C]/5"
              title="加入播放列表"
            >
              <QueueListIcon className="w-5 h-5" />
            </button>
          </Link>
        ))}
      </div>

      {/* View More Button */}
      <button
        onClick={handleViewMore}
        className="w-full py-3 mt-2 text-sm font-bold text-[#1F7A5C] bg-[#1F7A5C]/5 hover:bg-[#1F7A5C]/10 rounded-xl transition-all uppercase tracking-widest border border-[#1F7A5C]/10"
      >
        查看更多内容
      </button>
    </div>
  );
}
