"use client";
import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePlayerStore } from "@/store/player-store";
import {
  Play,
  Pause,
  ChevronDown,
  SkipBack,
  SkipForward,
  FileText,
} from "lucide-react";

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export default function MobilePlayerPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };

  const {
    currentEpisode,
    isPlaying,
    togglePlay,
    currentTime,
    duration,
    audioRef,
    setCurrentTime,
    forward,
    backward,
  } = usePlayerStore();

  // If user refreshes and store is empty, or ID mismatch, redirect back to episode reading page
  useEffect(() => {
    if (!currentEpisode || currentEpisode.episodeid !== id) {
      router.replace(`/episode/${id}`);
    }
  }, [currentEpisode, id, router]);

  if (!currentEpisode) return null;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef) audioRef.currentTime = time;
    setCurrentTime(time);
  };

  return (
    <div className="fixed inset-0 z-[100] h-[100dvh] w-full bg-base-100 flex flex-col px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-300 ease-out isolate">
      {/* Top bar */}
      <div className="flex items-center justify-between w-full mb-4">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-base-200"
        >
          <ChevronDown size={28} />
        </button>
        <span className="text-xs font-semibold tracking-wider text-base-content/60 uppercase">
          Now Playing
        </span>
        <div className="w-10"></div> {/* Spacer for alignment */}
      </div>

      {/* Cover Art */}
      <div className="flex-1 min-h-0 flex items-center justify-center py-4">
        <div
          className="w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden shadow-2xl bg-base-200 transition-transform duration-500 ease-out"
          style={{ transform: isPlaying ? "scale(1)" : "scale(0.95)" }}
        >
          <img
            src={currentEpisode.coverUrl}
            alt={currentEpisode.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Info */}
      <div className="w-full flex flex-col items-start min-h-0 mb-6 mt-4 shrink-0">
        <h1 className="text-2xl font-bold text-base-content line-clamp-2 leading-tight mb-1">
          {currentEpisode.title}
        </h1>
        <p className="text-lg text-base-content/60 line-clamp-1">
          {currentEpisode.podcast?.title}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full mb-6 shrink-0">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeekChange}
          className="range range-xs range-primary w-full [--range-shdw:none]"
        />
        <div className="flex justify-between items-center mt-2 opacity-60 text-xs font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center w-full mb-8 shrink-0 px-4">
        <button
          onClick={backward}
          className="text-base-content/70 hover:text-base-content transition-colors p-2 active:scale-95"
        >
          <SkipBack size={32} />
        </button>
        <button
          onClick={togglePlay}
          className="btn btn-circle btn-primary w-20 h-20 shadow-xl border-none active:scale-95 transition-transform"
        >
          {isPlaying ? (
            <Pause size={36} fill="currentColor" />
          ) : (
            <Play size={36} fill="currentColor" className="ml-2" />
          )}
        </button>
        <button
          onClick={forward}
          className="text-base-content/70 hover:text-base-content transition-colors p-2 active:scale-95"
        >
          <SkipForward size={32} />
        </button>
      </div>

      {/* Actions (Go to reading mode) */}
      <div className="flex justify-center w-full mt-auto shrink-0 pt-2">
        <button
          onClick={() => router.push(`/episode/${currentEpisode.episodeid}`)}
          className="btn btn-block btn-outline border-base-content/20 bg-base-200/30 backdrop-blur-md text-base-content font-medium rounded-xl h-14"
        >
          <FileText size={20} className="mr-2" />
          进入精读模式
        </button>
      </div>
    </div>
  );
}
