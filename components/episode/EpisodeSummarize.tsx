"use client";

import { Episode } from "@/core/episode/episode.entity";
import {
  PlayIcon,
  PauseIcon,
  HeartIcon,
  ShareIcon,
  CalendarDaysIcon,
  ClockIcon,
  TvIcon,
  EllipsisHorizontalIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/solid";
import {
  PlayIcon as PlayIconOutline,
  HashtagIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import Image from "next/image";
import { usePlayerStore } from "@/store/player-store";
import { useState } from "react";

export default function EpisodeSummarize({ episode }: { episode: Episode }) {
  const {
    play,
    togglePlay,
    isPlaying,
    currentEpisode,
    setCurrentEpisode,
    setCurrentAudioUrl,
  } = usePlayerStore();

  const [isDescExpanded, setIsDescExpanded] = useState(false);

  const isCurrentEpisode = currentEpisode?.episodeid === episode.episodeid;
  const isPlayingThis = isCurrentEpisode && isPlaying;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCurrentEpisode) {
      togglePlay();
    } else {
      setCurrentEpisode(episode);
      setCurrentAudioUrl(episode.audioUrl);
      play();
    }
  };

  const publishDate = new Date(episode.publishAt).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const durationMins = Math.floor(episode.duration / 60);

  return (
    <>
      {/* =====================================================================================
          Mobile & Tablet Layout (< xl)
          设计风格：紧凑型媒体卡片 (Compact Media Card)
          目的：节省垂直空间，让用户快速看到下方的文稿，同时保留核心操作。
      ===================================================================================== */}
      <div className="xl:hidden bg-base-100 rounded-[1.5rem] p-4 sm:p-5 shadow-sm border border-base-200/60 mb-6">
        <div className="flex gap-4 sm:gap-6">
          {/* 左侧：小封面 */}
          <div className="shrink-0 w-24 h-24 sm:w-64 sm:h-36 relative rounded-xl overflow-hidden shadow-md ring-1 ring-black/5 group">
            <Image
              src={episode.coverUrl}
              alt={episode.title}
              fill
              className="object-cover"
            />
            {/* 移动端封面点击也可播放 */}
            <div
              className="absolute inset-0 bg-black/10 flex items-center justify-center active:bg-black/30 transition-colors cursor-pointer"
              onClick={handlePlay}
            >
              {isPlayingThis && (
                <div className="loading loading-ring text-white w-8 h-8"></div>
              )}
            </div>
          </div>

          {/* 右侧：信息与操作 */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Link
                  href={`/podcast/${episode.podcastid}`}
                  className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-nowrap truncate max-w-[120px]"
                >
                  {episode.podcast?.title}
                </Link>
                <span className="text-xs text-base-content/40 font-medium truncate">
                  {publishDate}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold leading-tight text-base-content line-clamp-2">
                {episode.title}
              </h1>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handlePlay}
                className="btn btn-primary btn-sm rounded-full gap-1.5 shadow-lg shadow-primary/20 flex-1 sm:flex-none sm:px-6"
              >
                {isPlayingThis ? (
                  <PauseIcon className="w-4 h-4" />
                ) : (
                  <PlayIcon className="w-4 h-4" />
                )}
                {isPlayingThis ? "暂停" : "播放"}
              </button>

              <div className="flex gap-1">
                <button className="btn btn-ghost btn-sm btn-circle text-base-content/60">
                  <HeartIcon className="w-5 h-5" />
                </button>
                <button className="btn btn-ghost btn-sm btn-circle text-base-content/60">
                  <EllipsisHorizontalIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 移动端简介折叠 */}
        <div
          className="mt-4 pt-3 border-t border-dashed border-base-200 text-sm text-base-content/70 leading-relaxed cursor-pointer active:opacity-70 transition-opacity"
          onClick={() => setIsDescExpanded(!isDescExpanded)}
        >
          <p className={isDescExpanded ? "" : "line-clamp-2"}>
            {episode.description || "暂无简介"}
          </p>
          {!isDescExpanded &&
            episode.description &&
            episode.description.length > 60 && (
              <div className="flex justify-center mt-1">
                <span className="text-xs text-base-content/30 bg-base-200/50 px-3 py-0.5 rounded-full">
                  展开详情
                </span>
              </div>
            )}
        </div>
      </div>

      {/* =====================================================================================
          Desktop Sidebar Layout (>= xl)
          设计风格：沉浸式侧边栏 (Immersive Sidebar)
          目的：利用宽屏优势，展示大幅封面，提供完整信息，作为阅读时的视觉锚点。
      ===================================================================================== */}
      <div className="hidden xl:flex flex-col gap-8 px-2">
        {/* 1. 封面区域 */}
        <div className="group relative aspect-[16/9] w-full rounded-[2rem] overflow-hidden shadow-2xl shadow-base-300/60 ring-1 ring-black/5 bg-base-100">
          <Image
            src={episode.coverUrl}
            alt={episode.title}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            priority
          />
          {/* 磨砂玻璃播放遮罩 */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
            <button
              onClick={handlePlay}
              className="btn btn-circle btn-xl bg-white/20 border-white/40 text-white backdrop-blur-md hover:bg-white hover:text-primary hover:border-white hover:scale-110 shadow-2xl transition-all"
            >
              {isPlayingThis ? (
                <PauseIcon className="w-10 h-10" />
              ) : (
                <PlayIcon className="w-10 h-10 ml-1" />
              )}
            </button>
          </div>
        </div>

        {/* 2. 标题与核心信息 */}
        <div className="space-y-4 text-center">
          <Link
            href={`/podcast/${episode.podcastid}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-primary uppercase bg-primary/5 hover:bg-primary/10 px-3 py-1 rounded-full transition-colors"
          >
            <TvIcon className="w-3 h-3" />
            {episode.podcast?.title}
          </Link>

          <h1 className="text-2xl font-black leading-tight text-base-content">
            {episode.title}
          </h1>

          <div className="flex items-center justify-center gap-4 text-xs font-medium text-base-content/40 uppercase tracking-widest">
            <span className="flex items-center gap-1">
              <CalendarDaysIcon className="w-3.5 h-3.5" />
              {publishDate}
            </span>
            <span className="w-1 h-1 rounded-full bg-base-300"></span>
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5" />
              {durationMins} MINS
            </span>
          </div>
        </div>

        {/* 3. 主要操作区 */}
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={handlePlay}
            className="btn btn-primary btn-lg w-full rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300"
          >
            {isPlayingThis ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>{" "}
                正在播放
              </>
            ) : (
              <>
                <PlayIconOutline className="w-6 h-6 stroke-2" /> 立即播放
              </>
            )}
          </button>

          <div className="grid grid-cols-3 gap-3">
            <button className="btn btn-ghost bg-base-100 border-base-200 hover:border-primary/30 hover:bg-base-100 rounded-xl text-base-content/60 flex flex-col gap-1 h-auto py-3 text-xs font-normal">
              <HeartIcon className="w-6 h-6" /> 点赞
            </button>
            <button className="btn btn-ghost bg-base-100 border-base-200 hover:border-primary/30 hover:bg-base-100 rounded-xl text-base-content/60 flex flex-col gap-1 h-auto py-3 text-xs font-normal">
              <ArrowDownTrayIcon className="w-6 h-6" /> 下载
            </button>
            <button className="btn btn-ghost bg-base-100 border-base-200 hover:border-primary/30 hover:bg-base-100 rounded-xl text-base-content/60 flex flex-col gap-1 h-auto py-3 text-xs font-normal">
              <ShareIcon className="w-6 h-6" /> 分享
            </button>
          </div>
        </div>

        {/* 4. 简介 */}
        <div className="bg-white/50 p-5 rounded-2xl border border-base-200/50">
          <h3 className="text-xs font-bold text-base-content/40 uppercase mb-3 flex items-center gap-2">
            简介
            <span className="h-px flex-1 bg-base-200"></span>
          </h3>
          <p className="text-sm text-base-content/70 leading-7 text-justify whitespace-pre-line font-sans">
            {episode.description || "本集暂无文字简介。"}
          </p>
        </div>

        {/* 5. 标签 */}
        {episode.tags && episode.tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {episode.tags.map((tag) => (
              <span
                key={tag.id}
                className="badge badge-lg bg-base-100 border-base-200 text-base-content/50 gap-1 pl-1.5 pr-3 text-xs hover:border-primary/30 cursor-pointer transition-colors"
              >
                <HashtagIcon className="w-3 h-3 opacity-50" />
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
