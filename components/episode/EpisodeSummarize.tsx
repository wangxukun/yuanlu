"use client";

import { Episode } from "@/core/episode/episode.entity";
import {
  PlayIcon,
  PauseIcon,
  HeartIcon,
  BookmarkIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  ClockIcon,
  TagIcon,
  TvIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import Image from "next/image";
import { usePlayerStore } from "@/store/player-store";

export default function EpisodeSummarize({ episode }: { episode: Episode }) {
  const {
    play,
    togglePlay,
    isPlaying,
    currentEpisode,
    setCurrentEpisode,
    setCurrentAudioUrl,
  } = usePlayerStore();

  const isCurrentEpisode = currentEpisode?.episodeid === episode.episodeid;
  const isPlayingThis = isCurrentEpisode && isPlaying;

  const handlePlay = () => {
    if (isCurrentEpisode) {
      togglePlay();
    } else {
      setCurrentEpisode(episode);
      setCurrentAudioUrl(episode.audioUrl);
      play();
    }
  };

  return (
    // 容器布局逻辑：
    // 1. Mobile (< md): flex-col (上下堆叠)
    // 2. Tablet (md ~ xl): flex-row (左右并排，像一张宽卡片)
    // 3. Desktop (>= xl): flex-col (回到上下堆叠，适应侧边栏宽度)
    <div className="flex flex-col md:flex-row xl:flex-col gap-6 md:gap-8 bg-base-100 xl:bg-transparent p-4 md:p-6 xl:p-0 rounded-3xl xl:rounded-none shadow-sm xl:shadow-none border border-base-200 xl:border-none">
      {/* --- 封面区域 --- */}
      <div className="shrink-0 w-full md:w-64 xl:w-full">
        <div className="group relative w-full aspect-square overflow-hidden rounded-2xl shadow-lg border border-base-200 bg-base-100">
          <Image
            src={episode.coverUrl}
            alt={episode.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* 播放遮罩 */}
          <div
            className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] transition-opacity duration-300
                bg-black/30 opacity-0 group-hover:opacity-100"
          >
            <button
              onClick={handlePlay}
              className="btn btn-circle btn-lg btn-primary shadow-2xl scale-110 border-none"
            >
              {isPlayingThis ? (
                <PauseIcon className="w-8 h-8" />
              ) : (
                <PlayIcon className="w-8 h-8 ml-1" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* --- 信息区域 --- */}
      <div className="flex flex-col justify-center flex-1 min-w-0 space-y-4">
        {/* 标题 & 平台 */}
        <div>
          <h1 className="text-2xl font-bold leading-tight mb-3 text-base-content">
            {episode.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-base-content/70">
            <Link
              href={`/podcast/${episode.podcastid}`}
              className="flex items-center gap-1.5 font-medium hover:text-primary transition-colors bg-base-200/50 px-2 py-1 rounded-md"
            >
              <TvIcon className="w-4 h-4" />
              {episode.podcast?.title || "未知频道"}
            </Link>
          </div>
        </div>

        {/* 元数据 */}
        <div className="flex items-center gap-4 text-xs font-medium text-base-content/50 uppercase tracking-wide">
          <div className="flex items-center gap-1.5">
            <CalendarDaysIcon className="w-4 h-4" />
            {new Date(episode.publishAt).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1.5">
            <ClockIcon className="w-4 h-4" />
            {Math.floor(episode.duration / 60)} 分钟
          </div>
        </div>

        {/* 标签 */}
        {episode.tags && episode.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {episode.tags.map((tagRef) => (
              <span
                key={tagRef.id}
                className="badge badge-outline gap-1 text-xs py-3"
              >
                <TagIcon className="w-3 h-3 opacity-70" />
                {tagRef.name}
              </span>
            ))}
          </div>
        )}

        {/* 简介 (限制行数，移动端可展开) */}
        <p className="text-sm text-base-content/80 leading-relaxed line-clamp-3 md:line-clamp-4 hover:line-clamp-none transition-all cursor-pointer">
          {episode.description || "暂无简介..."}
        </p>

        {/* 操作按钮组 */}
        <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            className="btn btn-primary btn-sm md:btn-md gap-2"
            onClick={handlePlay}
          >
            {isPlayingThis ? (
              <PauseIcon className="w-4 h-4" />
            ) : (
              <PlayIcon className="w-4 h-4" />
            )}
            {isPlayingThis ? "暂停" : "播放"}
          </button>
          <button className="btn btn-ghost btn-sm md:btn-md border-base-200 gap-2">
            <HeartIcon className="w-4 h-4" /> 点赞
          </button>
          <button className="btn btn-ghost btn-sm md:btn-md border-base-200 gap-2">
            <BookmarkIcon className="w-4 h-4" /> 收藏
          </button>
          <button className="btn btn-ghost btn-sm md:btn-md border-base-200 gap-2">
            <ShareIcon className="w-4 h-4" /> 分享
          </button>
        </div>

        {/* 下载 */}
        <button className="btn btn-outline btn-block btn-sm gap-2 mt-2">
          <ArrowDownTrayIcon className="w-4 h-4" />
          下载 PDF 讲义
        </button>
      </div>
    </div>
  );
}
