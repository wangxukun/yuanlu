"use client";

import { Episode } from "@/core/episode/episode.entity";
import {
  PlayIcon,
  PauseIcon, // [新增] 引入暂停图标
  HeartIcon,
  BookmarkIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  ClockIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import Image from "next/image";
import { usePlayerStore } from "@/store/player-store";

export default function EpisodeSummarize({ episode }: { episode: Episode }) {
  // [修改] 获取更多状态和方法
  const {
    play,
    togglePlay,
    isPlaying,
    currentEpisode,
    setCurrentEpisode,
    setCurrentAudioUrl,
  } = usePlayerStore();

  // [新增] 判断当前页面展示的剧集，是否就是播放器里的那一集
  const isCurrentEpisode = currentEpisode?.episodeid === episode.episodeid;
  // [新增] 是否正在播放当前这集
  const isPlayingThis = isCurrentEpisode && isPlaying;

  const handlePlay = () => {
    if (isCurrentEpisode) {
      // 如果是当前集，直接切换 播放/暂停
      togglePlay();
    } else {
      // 如果是新的一集，切歌并播放
      setCurrentEpisode(episode);
      setCurrentAudioUrl(episode.audioUrl);
      play();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 封面与核心信息区 */}
      <div className="group relative w-full aspect-square md:aspect-video lg:aspect-square overflow-hidden rounded-2xl shadow-xl border border-base-200 bg-base-100">
        <Image
          src={episode.coverUrl}
          alt={episode.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {/* 播放遮罩 */}
        {/* [修改]
            1. 如果正在播放，常驻显示暂停按钮（方便暂停）
            2. 如果没播放，悬停显示播放按钮
        */}
        <div
          className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] transition-opacity duration-300
                bg-black/30 opacity-0 group-hover:opacity-100"
        >
          <button
            onClick={handlePlay}
            className="btn btn-circle btn-lg btn-primary shadow-2xl scale-110 border-none"
          >
            {/* [修改] 动态图标切换 */}
            {isPlayingThis ? (
              <PauseIcon className="w-8 h-8" />
            ) : (
              <PlayIcon className="w-8 h-8 ml-1" />
            )}
          </button>
        </div>
      </div>

      {/* 信息区 */}
      <div className="space-y-4">
        {/* 标题 & 平台 */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-2 text-base-content">
            {episode.title}
          </h1>
          <div className="flex flex-wrap gap-2 text-sm text-base-content/70">
            <Link
              href={`/podcast/${episode.podcastid}`}
              className="hover:text-primary transition-colors flex items-center gap-1 font-medium"
            >
              📺 {episode.podcast?.title || "未知频道"}
            </Link>
          </div>
        </div>

        {/* 元数据 (日期/时长) */}
        <div className="flex items-center gap-4 text-xs text-base-content/50 font-mono uppercase tracking-wide">
          <div className="flex items-center gap-1">
            <CalendarDaysIcon className="w-4 h-4" />
            {new Date(episode.publishAt).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1">
            <ClockIcon className="w-4 h-4" />
            {Math.floor(episode.duration / 60)} 分钟
          </div>
        </div>

        {/* 简介 */}
        <div className="text-sm text-base-content/80 leading-relaxed line-clamp-4 hover:line-clamp-none transition-all cursor-pointer">
          {episode.description || "暂无简介..."}
        </div>

        {/* 标签 */}
        {episode.tags && episode.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {episode.tags.map((tagRef) => (
              <span
                key={tagRef.tagid}
                className="badge badge-ghost badge-sm gap-1 text-xs"
              >
                <TagIcon className="w-3 h-3" />
                {tagRef.tag.name}
              </span>
            ))}
          </div>
        )}

        {/* 操作按钮组 */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          {/* [修改] 播放/暂停按钮 */}
          <button
            className="btn btn-sm md:btn-md btn-primary flex flex-col md:flex-row gap-1 h-auto py-2 md:py-0"
            onClick={handlePlay}
          >
            {isPlayingThis ? (
              <>
                <PauseIcon className="w-5 h-5" />
                <span className="text-xs md:text-sm">暂停</span>
              </>
            ) : (
              <>
                <PlayIcon className="w-5 h-5" />
                <span className="text-xs md:text-sm">播放</span>
              </>
            )}
          </button>

          <button className="btn btn-sm md:btn-md btn-ghost border-base-200 flex flex-col md:flex-row gap-1 h-auto py-2 md:py-0">
            <HeartIcon className="w-5 h-5" />
            <span className="text-xs md:text-sm hidden md:inline">点赞</span>
          </button>
          <button className="btn btn-sm md:btn-md btn-ghost border-base-200 flex flex-col md:flex-row gap-1 h-auto py-2 md:py-0">
            <BookmarkIcon className="w-5 h-5" />
            <span className="text-xs md:text-sm hidden md:inline">收藏</span>
          </button>
          <button className="btn btn-sm md:btn-md btn-ghost border-base-200 flex flex-col md:flex-row gap-1 h-auto py-2 md:py-0">
            <ShareIcon className="w-5 h-5" />
            <span className="text-xs md:text-sm hidden md:inline">分享</span>
          </button>
        </div>

        {/* 下载文档按钮 */}
        <button className="btn btn-block btn-outline btn-sm gap-2">
          <ArrowDownTrayIcon className="w-4 h-4" />
          下载 PDF 讲义
        </button>
      </div>
    </div>
  );
}
