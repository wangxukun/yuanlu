import React from "react";
import Image from "next/image";
import {
  EllipsisHorizontalIcon,
  ClockIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  QueueListIcon,
  ShareIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
  PlayIcon as PlaySolidIcon,
  CheckCircleIcon as CheckCircleSolidIcon,
  PauseIcon,
} from "@heroicons/react/24/solid";
import { Headphones } from "lucide-react";
import { formatTime } from "@/lib/tools";
import { Episode } from "@/core/episode/episode.entity";

interface EpisodeWithProgress extends Episode {
  progressSeconds?: number;
  isFinished?: boolean;
}

interface EpisodeCardProps {
  episode: EpisodeWithProgress;
  podcastCoverUrl: string;
  isCurrentPlaying: boolean;
  isCurrentPaused: boolean;
  activeMenuId: string | null;
  onMenuToggle: (id: string | null) => void;
  onPlayClick: (e: React.MouseEvent, episode: Episode) => void;
  onRowClick: (episode: Episode) => void;
}

export default function EpisodeCard({
  episode,
  podcastCoverUrl,
  isCurrentPlaying,
  isCurrentPaused,
  activeMenuId,
  onMenuToggle,
  onPlayClick,
  onRowClick,
}: EpisodeCardProps) {
  const progressSeconds = episode.progressSeconds || 0;
  const isFinished = episode.isFinished || false;
  const duration = episode.duration || 0;

  const displayCover =
    episode.coverUrl || podcastCoverUrl || "/placeholder.png";

  let progressPercentage = 0;
  if (isFinished) {
    progressPercentage = 100;
  } else if (duration > 0) {
    progressPercentage = Math.min((progressSeconds / duration) * 100, 100);
  }

  const isMenuOpen = activeMenuId === episode.episodeid;

  return (
    <div
      className={`group flex flex-col sm:flex-row gap-4 p-3 sm:p-4 rounded-2xl border transition-all duration-300 cursor-pointer relative ${
        isMenuOpen ? "z-20" : "z-0"
      } ${
        isCurrentPlaying || isCurrentPaused
          ? "bg-primary/5 border-primary/30 shadow-md"
          : "bg-base-100 border-transparent hover:border-base-200 hover:bg-base-50 hover:shadow-sm"
      }`}
      onClick={() => onRowClick(episode as Episode)}
    >
      {/* 封面 & 播放按钮 - 强制使用 aspect-video (16:9) 保持比例一致 */}
      <div className="relative w-full sm:w-40 lg:w-64 aspect-video shrink-0 rounded-xl overflow-hidden bg-base-200 border border-base-200/50">
        <Image
          src={displayCover}
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
        {episode.difficulty && (
          <div className="absolute top-2 right-2 z-10">
            <div
              className={`bg-white/95 px-2 py-0.5 rounded shadow-sm font-extrabold text-sm tracking-wide ${
                episode.difficulty.includes("A")
                  ? "text-emerald-600"
                  : episode.difficulty.includes("B1")
                    ? "text-blue-600"
                    : episode.difficulty.includes("B2")
                      ? "text-purple-600"
                      : episode.difficulty.includes("C")
                        ? "text-rose-600"
                        : "text-gray-700"
              }`}
            >
              {episode.difficulty}
            </div>
          </div>
        )}

        {/* Category badge (bottom left) */}
        {episode.tags && episode.tags.length > 0 && (
          <div className="absolute bottom-2 left-2 z-10">
            <div className="flex bg-rose-100/95 text-rose-700 px-2 py-0.5 rounded shadow-sm font-bold text-xs items-center">
              <PlaySolidIcon className="w-3 h-3 mr-1" />
              {episode.tags[0].name}
            </div>
          </div>
        )}

        {/* Duration badge (bottom right) */}
        <div className="absolute bottom-2 right-2 z-10">
          <div className="flex bg-black/70 text-white backdrop-blur-sm px-2 py-0.5 rounded shadow-sm text-xs font-medium items-center">
            <ClockIcon className="w-3 h-3 mr-1" />
            {formatTime(episode.duration)}
          </div>
        </div>

        <div className="hidden sm:flex absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center z-20">
          <button
            onClick={(e) => onPlayClick(e, episode as Episode)}
            className="w-12 h-12 bg-white/90 text-primary rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform"
          >
            {isCurrentPlaying ? (
              <PauseIcon className="w-6 h-6" />
            ) : (
              <PlaySolidIcon className="w-6 h-6 ml-1" />
            )}
          </button>
        </div>
        {/* 移动端常显播放按钮 - 居中显示以避免遮挡右下角 badge */}
        <div className="sm:hidden absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <button
            onClick={(e) => onPlayClick(e, episode as Episode)}
            className="w-10 h-10 bg-primary/90 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform backdrop-blur-sm pointer-events-auto"
          >
            {isCurrentPlaying ? (
              <PauseIcon className="w-5 h-5" />
            ) : (
              <PlaySolidIcon className="w-5 h-5 ml-1" />
            )}
          </button>
        </div>
        {/* 移动端进度条 */}
        {progressPercentage > 0 && (
          <div className="sm:hidden absolute bottom-0 left-0 w-full h-1 bg-base-300/50 z-30">
            <div
              className={`h-full ${isFinished ? "bg-success" : "bg-primary"}`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* 信息区 */}
      <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3
            className={`text-base sm:text-lg font-bold break-words line-clamp-2 leading-tight transition-colors ${
              isCurrentPlaying
                ? "text-primary"
                : "text-base-content group-hover:text-primary"
            }`}
          >
            {episode.title}
          </h3>
          {/* 桌面端操作 */}
          <div className="hidden sm:flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="p-2 text-base-content/40 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <QueueListIcon className="w-5 h-5" />
            </button>
            <button
              className="p-2 text-base-content/40 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <ShareIcon className="w-5 h-5" />
            </button>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() =>
                  onMenuToggle(isMenuOpen ? null : episode.episodeid)
                }
                className="p-2 text-base-content/40 hover:text-base-content rounded-full hover:bg-base-300 transition-colors"
              >
                <EllipsisHorizontalIcon className="w-5 h-5" />
              </button>

              {isMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-base-100 rounded-xl shadow-xl border border-base-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button className="w-full text-left px-4 py-2 text-sm text-base-content hover:bg-base-200 flex items-center space-x-3 transition-colors">
                    <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                    <span>下载</span>
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-base-content hover:bg-base-200 flex items-center space-x-3 transition-colors">
                    <QueueListIcon className="w-3.5 h-3.5" />
                    <span>加入播放队列</span>
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-base-content hover:bg-base-200 flex items-center space-x-3 transition-colors">
                    <ArrowPathIcon className="w-3.5 h-3.5" />
                    <span>标记为已播</span>
                  </button>
                  <div className="h-px bg-base-200 my-1"></div>
                  <button className="w-full text-left px-4 py-2 text-sm text-base-content hover:bg-base-200 flex items-center space-x-3 transition-colors">
                    <ShareIcon className="w-3.5 h-3.5" />
                    <span>分享</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-base-content/60 line-clamp-2 leading-relaxed mb-3">
          {episode.description || "暂无简介"}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-3 text-xs font-medium text-base-content/50">
            <span className="flex items-center gap-1.5 bg-base-200/50 px-2.5 py-1 rounded-lg border border-base-200/50">
              <CalendarIcon className="w-3.5 h-3.5" />
              {new Date(episode.publishAt).toLocaleDateString()}
            </span>
            {/* <span className="flex items-center gap-1.5 bg-base-200/50 px-2.5 py-1 rounded-lg border border-base-200/50">
              <ClockIcon className="w-3.5 h-3.5" />
              {formatTime(episode.duration)}
            </span> */}
          </div>

          {/* 桌面端进度条 */}
          {progressPercentage > 0 && (
            <div className="hidden sm:flex items-center gap-2 w-32">
              <div className="flex-1 h-1.5 bg-base-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    isFinished ? "bg-success" : "bg-primary"
                  }`}
                  style={{
                    width: `${progressPercentage}%`,
                  }}
                ></div>
              </div>
              {isFinished && (
                <CheckCircleSolidIcon className="w-4 h-4 text-success shrink-0" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
