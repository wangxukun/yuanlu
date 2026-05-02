"use client";

import React, { useEffect, useState } from "react";
import { usePlayerStore } from "@/store/player-store";
import { useRouter } from "next/navigation";
import FullContentTranscript from "@/components/episode/FullContentTranscript";
import { MergedSubtitleItem } from "@/lib/types";

export default function PlayControlBar() {
  const router = useRouter();
  const {
    currentEpisode,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isShuffle,
    loopMode,
    playlist,
    togglePlay,
    playNext,
    playPrevious,
    setCurrentTime,
    audioRef,
    setPlaybackRate,
    setVolume,
    toggleShuffle,
    toggleLoopMode,
    removeFromPlaylist,
    playEpisode,
    closePlayer,
  } = usePlayerStore();

  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [subtitles, setSubtitles] = useState<MergedSubtitleItem[]>([]);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

  // 切换剧集时清空旧字幕
  useEffect(() => {
    setSubtitles([]);
  }, [currentEpisode?.episodeid]);

  // 加载字幕
  useEffect(() => {
    if (isLyricsOpen && currentEpisode?.episodeid) {
      const fetchSubtitles = async () => {
        setIsLoadingLyrics(true);
        try {
          const res = await fetch(
            `/api/episode/subtitles?id=${currentEpisode.episodeid}`,
          );
          const data = await res.json();
          if (data.success) {
            setSubtitles(data.data);
          } else {
            setSubtitles([]); // 若获取失败或为空，也设为空数组
          }
        } catch (error) {
          console.error("Failed to fetch subtitles:", error);
          setSubtitles([]);
        } finally {
          setIsLoadingLyrics(false);
        }
      };
      fetchSubtitles();
    }
  }, [isLyricsOpen, currentEpisode?.episodeid]);

  if (!currentEpisode) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef) {
      audioRef.currentTime = time;
    }
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };

  const handleOpenLyrics = () => {
    setIsLyricsOpen(true);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleInfoClick = () => {
    if (isLyricsOpen) {
      setIsLyricsOpen(false);
    }
    router.push(`/episode/${currentEpisode.episodeid}`);
  };

  return (
    <>
      <div
        className={`fixed transition-all duration-300 flex items-center gap-4 lg:gap-6 z-[210] ${
          isLyricsOpen
            ? "bottom-0 left-0 w-full max-w-none bg-white dark:bg-slate-900 px-4 py-4 md:px-8 border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] rounded-none transform-none"
            : "bottom-0 left-0 w-full md:bottom-8 md:left-1/2 md:-translate-x-1/2 xl:left-[calc(50%+144px)] md:w-[calc(100%-4rem)] md:max-w-4xl bg-white/95 dark:bg-slate-900/95 md:bg-white/80 md:dark:bg-slate-900/80 backdrop-blur-2xl p-4 md:rounded-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.08)] md:shadow-[0_20px_40px_rgba(90,66,232,0.1)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.3)] md:dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] border-t md:border border-slate-100 dark:border-slate-800 pb-safe"
        }`}
      >
        {/* Mobile Progress Bar - Positioned at the very top of the bar */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-100 dark:bg-slate-800 md:hidden overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeekChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <div
          className={`w-full flex items-center justify-between gap-2 md:gap-6 ${isLyricsOpen ? "max-w-[1200px] mx-auto" : ""}`}
        >
          {/* Left: Thumbnail & Info */}
          <div
            className="flex items-center gap-2 md:gap-4 w-auto md:w-1/4 md:min-w-[120px] cursor-pointer group"
            onClick={handleInfoClick}
          >
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-800">
              <img
                alt="当前播放"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                src={currentEpisode.coverUrl}
              />
            </div>
            <div className="hidden sm:flex flex-col justify-center overflow-hidden">
              <h4
                className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 transition-colors"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {currentEpisode.title}
              </h4>
              <p className="text-xs text-slate-500 truncate">
                {currentEpisode.podcast?.title || "未知节目"}
              </p>
            </div>
          </div>

          {/* Center: Controls & Progress */}
          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-4 md:gap-8">
              <button
                onClick={toggleShuffle}
                className={`transition-colors hidden sm:block ${isShuffle ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-indigo-600"}`}
                title={isShuffle ? "随机播放中" : "顺序播放"}
              >
                <span className="material-symbols-outlined">shuffle</span>
              </button>

              {/* Mobile Speed Button */}
              <button
                onClick={cyclePlaybackRate}
                className="text-slate-400 hover:text-indigo-600 font-bold text-[10px] sm:text-xs transition-colors w-6 sm:w-8 text-center md:hidden"
                title="播放速度"
              >
                {playbackRate}x
              </button>

              <button
                onClick={playPrevious}
                className="text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                title="上一首"
              >
                <span className="material-symbols-outlined">skip_previous</span>
              </button>

              <button
                onClick={togglePlay}
                className="w-9 h-9 md:w-10 md:h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
              >
                {isPlaying ? (
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    pause
                  </span>
                ) : (
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    play_arrow
                  </span>
                )}
              </button>

              <button
                onClick={playNext}
                className="text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                title="下一首"
              >
                <span className="material-symbols-outlined">skip_next</span>
              </button>

              {/* Mobile Fullscreen Button */}
              <button
                onClick={handleOpenLyrics}
                disabled={isLoadingLyrics}
                className={`text-slate-400 hover:text-indigo-600 transition-colors md:hidden ${isLoadingLyrics ? "animate-pulse" : ""}`}
                title="全屏沉浸模式"
              >
                <span className="material-symbols-outlined text-lg">
                  {isLoadingLyrics ? "hourglass_top" : "fullscreen"}
                </span>
              </button>

              <button
                onClick={toggleLoopMode}
                className={`transition-colors hidden sm:block ${loopMode !== "none" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-indigo-600"}`}
                title={
                  loopMode === "none"
                    ? "不循环"
                    : loopMode === "all"
                      ? "列表循环"
                      : "单曲循环"
                }
              >
                <span className="material-symbols-outlined">
                  {loopMode === "one" ? "repeat_one" : "repeat"}
                </span>
              </button>
            </div>

            {/* Desktop Progress Bar */}
            <div className="hidden md:flex items-center gap-3 w-full max-w-xl">
              <span className="text-[10px] text-slate-400 font-medium w-8 text-right">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full relative group/progress">
                <div
                  className="absolute left-0 top-0 h-full bg-indigo-600 rounded-full transition-all duration-150"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeekChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <span className="text-[10px] text-slate-400 font-medium w-8">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Right: Actions & Volume */}
          <div className="flex items-center justify-end gap-2 md:gap-4 w-auto md:w-1/4 md:min-w-[80px]">
            {/* Playback speed control */}
            <button
              onClick={cyclePlaybackRate}
              className="text-slate-400 hover:text-indigo-600 font-bold text-xs transition-colors w-8 text-center hidden md:block"
              title="播放速度"
            >
              {playbackRate}x
            </button>

            <button
              onClick={handleOpenLyrics}
              disabled={isLoadingLyrics}
              className={`text-slate-400 hover:text-indigo-600 transition-colors hidden md:block ${isLoadingLyrics ? "animate-pulse" : ""}`}
              title="全屏沉浸模式"
            >
              <span className="material-symbols-outlined">
                {isLoadingLyrics ? "hourglass_top" : "fullscreen"}
              </span>
            </button>

            {/* Playlist Button */}
            <button
              onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
              className={`transition-colors shrink-0 ${isPlaylistOpen ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-indigo-600"}`}
              title="播放列表"
            >
              <span className="material-symbols-outlined">playlist_play</span>
            </button>

            <div className="items-center gap-2 hidden lg:flex">
              <span className="material-symbols-outlined text-slate-400 text-lg">
                volume_up
              </span>
              <div className="w-20 h-1 bg-slate-200 dark:bg-slate-700 rounded-full relative flex items-center">
                <div
                  className="absolute left-0 top-0 h-full bg-indigo-600 rounded-full pointer-events-none"
                  style={{ width: `${volume * 100}%` }}
                ></div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Close button for mobile/desktop to dismiss player */}
            <button
              onClick={closePlayer}
              className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
              title="关闭播放器"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Playlist Dropdown */}
        {isPlaylistOpen && playlist.length > 0 && (
          <div className="absolute bottom-full right-4 md:right-0 mb-6 w-[calc(100vw-2rem)] md:w-80 max-h-[60vh] md:max-h-[400px] overflow-hidden flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                当前播放列表
              </h3>
              <span className="text-xs text-slate-500">
                {playlist.length} 首
              </span>
            </div>
            <div className="overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              {playlist.map((ep, idx) => (
                <div
                  key={`${ep.episodeid}-${idx}`}
                  className={`group/item flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                    currentEpisode.episodeid === ep.episodeid
                      ? "bg-indigo-50 dark:bg-indigo-900/30"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                  onClick={() => playEpisode(ep)}
                >
                  <div className="w-8 h-8 rounded shrink-0 overflow-hidden relative border border-slate-100 dark:border-slate-800">
                    <img
                      src={ep.coverUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {currentEpisode.episodeid === ep.episodeid && isPlaying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px] text-white animate-pulse">
                          volume_up
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold truncate ${currentEpisode.episodeid === ep.episodeid ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}`}
                    >
                      {ep.title}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {ep.podcast?.title}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromPlaylist(ep.episodeid);
                    }}
                    className="opacity-0 group-hover/item:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                    title="从列表中移除"
                  >
                    <span className="material-symbols-outlined text-sm">
                      close
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full-screen immersive transcript overlay */}
      {currentEpisode && (
        <FullContentTranscript
          isOpen={isLyricsOpen}
          onClose={() => setIsLyricsOpen(false)}
          subtitles={subtitles}
          episode={currentEpisode}
        />
      )}
    </>
  );
}
