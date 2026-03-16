"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { usePlayerStore } from "../../store/player-store";
import { Play, Pause, X, SkipBack, SkipForward } from "lucide-react";

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export default function PlayControlBar() {
  const router = useRouter();
  const {
    currentEpisode,
    isPlaying,
    togglePlay,
    closePlayer,
    currentTime,
    duration,
    audioRef,
    setCurrentTime,
    forward,
    backward,
  } = usePlayerStore();

  if (!currentEpisode) return null;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef) audioRef.currentTime = time;
    setCurrentTime(time);
  };

  const handleInfoClick = () => {
    if (!currentEpisode) return;
    const episodeUrl = `/episode/${currentEpisode.episodeid}`;
    if (window.innerWidth >= 1024) {
      router.push(episodeUrl);
    } else {
      router.push(`${episodeUrl}/player`);
    }
  };

  return (
    <div className="fixed bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] lg:bottom-0 left-0 lg:left-[var(--sidebar-width)] right-0 z-40 bg-base-100/95 backdrop-blur-lg border-t border-base-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="relative h-16 px-4 flex items-center justify-between gap-3">
        <div
          className="flex items-center flex-1 min-w-0 cursor-pointer group hover:bg-base-200/50 rounded-lg p-1 -ml-1 transition-colors"
          onClick={handleInfoClick}
          role="button"
          tabIndex={0}
        >
          <div className="relative shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-base-200 border border-base-300 shadow-sm">
            <img
              src={currentEpisode.coverUrl}
              alt={currentEpisode.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="ml-3 flex flex-col justify-center min-w-0">
            <h3 className="text-sm font-semibold text-base-content truncate pr-2 leading-tight">
              {currentEpisode.title}
            </h3>
            <p className="text-xs text-base-content/60 truncate leading-tight mt-0.5">
              {currentEpisode.podcast?.title}
            </p>
          </div>
        </div>

        <div className="hidden lg:flex flex-col absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md justify-center gap-1">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={backward}
              className="text-base-content/60 hover:text-primary"
            >
              <SkipBack size={20} />
            </button>
            <button
              onClick={togglePlay}
              className="btn btn-circle btn-sm btn-primary text-white shadow-md border-none"
            >
              {isPlaying ? (
                <Pause size={16} />
              ) : (
                <Play size={16} className="ml-0.5" />
              )}
            </button>
            <button
              onClick={forward}
              className="text-base-content/60 hover:text-primary"
            >
              <SkipForward size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2 w-full">
            <span className="text-[10px] text-base-content/50 font-mono">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeekChange}
              className="range range-xs range-primary w-full"
            />
            <span className="text-[10px] text-base-content/50 font-mono">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 lg:hidden">
          <button
            onClick={togglePlay}
            className="btn btn-circle btn-sm btn-primary text-white shadow-md border-none"
          >
            {isPlaying ? (
              <Pause size={16} />
            ) : (
              <Play size={16} className="ml-0.5" />
            )}
          </button>
          <button
            onClick={closePlayer}
            className="p-2 rounded-full text-base-content/40 hover:bg-base-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-3 shrink-0 w-32 justify-end">
          <button
            onClick={closePlayer}
            className="p-2 rounded-full text-base-content/40 hover:bg-base-200"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      <div className="h-0.5 w-full bg-base-200 absolute bottom-0 left-0 lg:hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}
