"use client";

import React from "react";
import { usePlayerStore } from "@/store/player-store";

export default function PlaylistDropdown({
  className = "",
}: {
  className?: string;
}) {
  const {
    isPlaylistOpen,
    playlist,
    currentEpisode,
    isPlaying,
    playEpisode,
    removeFromPlaylist,
  } = usePlayerStore();

  if (!isPlaylistOpen || playlist.length === 0) return null;

  return (
    <div
      className={`overflow-hidden flex flex-col bg-base-100 rounded-2xl shadow-e3 border border-base-200 z-50 ${className}`}
    >
      <div className="p-4 border-b border-base-200 flex justify-between items-center bg-base-200/50">
        <h3 className="font-bold text-sm text-ink-800 dark:text-ink-200">
          当前播放列表
        </h3>
        <span className="text-xs text-ink-500">{playlist.length} 首</span>
      </div>
      <div className="overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-ink-200 dark:scrollbar-thumb-ink-700">
        {playlist.map((ep, idx) => (
          <div
            key={`${ep.episodeid}-${idx}`}
            className={`group/item flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
              currentEpisode?.episodeid === ep.episodeid
                ? "bg-primary-50 dark:bg-primary-900/30"
                : "hover:bg-ink-50 dark:hover:bg-ink-800/50"
            }`}
            onClick={() => playEpisode(ep)}
          >
            <div className="w-8 h-8 rounded shrink-0 overflow-hidden relative border border-base-200">
              <img
                src={ep.coverUrl}
                alt=""
                className="w-full h-full object-cover"
              />
              {currentEpisode?.episodeid === ep.episodeid && isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-[1.5px]">
                  <div
                    className="w-[2px] h-2.5 bg-white rounded-full animate-eq"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-[2px] h-2.5 bg-white rounded-full animate-eq"
                    style={{ animationDelay: "200ms" }}
                  />
                  <div
                    className="w-[2px] h-2.5 bg-white rounded-full animate-eq"
                    style={{ animationDelay: "400ms" }}
                  />
                  <div
                    className="w-[2px] h-2.5 bg-white rounded-full animate-eq"
                    style={{ animationDelay: "600ms" }}
                  />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-xs font-semibold truncate ${
                  currentEpisode?.episodeid === ep.episodeid
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-ink-700 dark:text-ink-300"
                }`}
              >
                {ep.title}
              </p>
              <p className="text-[10px] text-ink-400 truncate">
                {ep.podcast?.title}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFromPlaylist(ep.episodeid);
              }}
              className="opacity-0 group-hover/item:opacity-100 p-1 text-ink-400 hover:text-error-500 transition-all"
              title="从列表中移除"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
