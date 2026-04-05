"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { usePlayerStore } from "@/store/player-store";
import { Episode } from "@/core/episode/episode.entity";
import { togglePodcastFavorite } from "@/lib/actions/favorite-actions";

import PodcastHero from "./PodcastHero";
import EpisodeList from "./EpisodeList";
import ChannelPodcasts from "./ChannelPodcasts";
import type { ChannelPodcastItem } from "./ChannelPodcasts";

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
  channelPodcasts: ChannelPodcastItem[];
}

interface EpisodeWithProgress extends Episode {
  progressSeconds?: number;
  isFinished?: boolean;
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

  // ---------------------- Handlers ----------------------
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
    if (podcast.episode && podcast.episode.length > 0) {
      const latest = [...podcast.episode].sort(
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
    <div className="min-h-screen bg-base-100 font-sans pb-24 relative w-full overflow-x-hidden">
      {/* 沉浸式背景模糊 */}
      <div className="absolute top-0 left-0 w-full h-[500px] overflow-hidden -z-10 pointer-events-none">
        <Image
          src={podcast.coverUrl}
          alt="bg"
          fill
          className="object-cover opacity-20 blur-[80px] saturate-150 scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-base-100/80 to-base-100"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-12 relative z-10">
        {/* 桌面端返回按钮 */}
        <button
          onClick={handleBack}
          className="hidden lg:flex items-center gap-2 text-base-content/60 hover:text-primary transition-colors mb-8 font-medium group w-fit"
        >
          <div className="p-1.5 rounded-full bg-base-200 group-hover:bg-primary/10 transition-colors">
            <ArrowLeftIcon className="w-4 h-4" />
          </div>
          返回
        </button>

        <div className="flex flex-col lg:flex-row gap-2 lg:gap-12 items-start">
          {/* 左侧：Sticky 播客信息区 */}
          <PodcastHero
            podcast={podcast}
            initialPlays={initialPlays}
            favoritesCount={favoritesCount}
            isFavorited={isFavorited}
            isLoadingFavorite={isLoadingFavorite}
            onPlayLatest={handlePlayLatest}
            onToggleFavorite={handleToggleFavorite}
          />

          {/* 右侧：简介与剧集列表 */}
          <div className="flex-1 w-full min-w-0 z-10">
            {/* 简介区块 */}
            <div className="bg-base-100/80 backdrop-blur-xl rounded-[2rem] p-6 lg:p-8 shadow-sm border border-base-200/50 mb-8">
              <h3 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                <InformationCircleIcon className="w-5 h-5 text-primary" />
                关于播客
              </h3>
              <p className="text-base-content/70 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                {podcast.description || "暂无简介"}
              </p>
            </div>

            {/* 剧集列表 */}
            <EpisodeList
              episodes={podcast.episode as unknown as EpisodeWithProgress[]}
              podcastCoverUrl={podcast.coverUrl}
              podcastId={podcast.podcastid}
              currentPlayingId={currentEpisode?.episodeid}
              isPlaying={isPlaying}
              onPlayClick={handlePlayClick}
              onRowClick={handleRowClick}
            />

            {/* 同频道其他播客 */}
            {podcast.platform && podcast.channelPodcasts?.length > 0 && (
              <div className="mt-8">
                <ChannelPodcasts
                  channelName={podcast.platform}
                  podcasts={podcast.channelPodcasts}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
