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
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
        {/* 移动端常显播放按钮 */}
        <div className="sm:hidden absolute bottom-2 right-2">
          <button
            onClick={(e) => onPlayClick(e, episode as Episode)}
            className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
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
          <div className="sm:hidden absolute bottom-0 left-0 w-full h-1 bg-base-300/50">
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
            <span className="flex items-center gap-1.5 bg-base-200/50 px-2.5 py-1 rounded-lg border border-base-200/50">
              <ClockIcon className="w-3.5 h-3.5" />
              {formatTime(episode.duration)}
            </span>
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
