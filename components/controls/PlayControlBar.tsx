"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePlayerStore } from "../../store/player-store";
import { toast } from "sonner";
import { MergedSubtitleItem } from "@/components/episode/transcript/types";
import FullContentTranscript from "@/components/episode/FullContentTranscript";

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
    playbackRate,
    setPlaybackRate,
    loopMode,
    toggleLoopMode,
    isShuffle,
    toggleShuffle,
    isPlaylistOpen,
    setIsPlaylistOpen,
    playlist,
    playEpisode,
    playPrevious,
    playNext,
    removeFromPlaylist,
  } = usePlayerStore();

  const [volume, setVolume] = useState(0.75);

  // Lyrics / FullContentTranscript state
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [subtitles, setSubtitles] = useState<MergedSubtitleItem[]>([]);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const cachedEpisodeId = useRef<string | null>(null);

  // Clear subtitle cache when episode changes
  useEffect(() => {
    if (currentEpisode?.episodeid !== cachedEpisodeId.current) {
      setSubtitles([]);
      setIsLyricsOpen(false);
      cachedEpisodeId.current = currentEpisode?.episodeid ?? null;
    }
  }, [currentEpisode?.episodeid]);

  const handleOpenLyrics = useCallback(async () => {
    if (!currentEpisode) return;
    // If subtitles already loaded for this episode, just open
    if (subtitles.length > 0) {
      setIsLyricsOpen(true);
      return;
    }
    setIsLoadingLyrics(true);
    try {
      const res = await fetch(
        `/api/episode/subtitles?id=${currentEpisode.episodeid}`,
      );
      const json = await res.json();
      if (json.success && json.data?.length > 0) {
        setSubtitles(json.data);
        setIsLyricsOpen(true);
      } else {
        toast.error("该单集暂无字幕");
      }
    } catch {
      toast.error("字幕加载失败");
    } finally {
      setIsLoadingLyrics(false);
    }
  }, [currentEpisode, subtitles]);

  if (!currentEpisode) return null;

  const cyclePlaybackRate = () => {
    const rates = [0.8, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex =
      currentIndex === -1 ? 1 : (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef) audioRef.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (audioRef) audioRef.volume = val;
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

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <div
        className={`fixed transition-all duration-300 flex items-center gap-4 lg:gap-6 z-[210] ${
          isLyricsOpen
            ? "bottom-0 left-0 w-full max-w-none bg-white dark:bg-slate-900 px-4 py-4 md:px-8 border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] rounded-none transform-none"
            : "bottom-8 left-1/2 -translate-x-1/2 lg:left-[calc(50%+144px)] w-[calc(100%-4rem)] max-w-4xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-4 rounded-2xl shadow-[0_20px_40px_rgba(90,66,232,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] border border-slate-100 dark:border-slate-800"
        }`}
      >
        <div
          className={`w-full flex items-center justify-between gap-4 lg:gap-6 ${isLyricsOpen ? "max-w-[1200px] mx-auto" : ""}`}
        >
          {/* Left: Thumbnail & Info */}
          <div
            className="flex items-center gap-4 w-1/4 min-w-[120px] cursor-pointer group"
            onClick={handleInfoClick}
          >
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-800">
              <img
                alt="当前播放"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                src={currentEpisode.coverUrl}
              />
            </div>
            <div className="hidden sm:block overflow-hidden">
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
          <div className="flex-1 flex flex-col items-center">
            <div className="flex items-center gap-4 lg:gap-6 mb-2">
              <button
                onClick={toggleShuffle}
                className={`transition-colors hidden sm:block ${isShuffle ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-indigo-600"}`}
                title={isShuffle ? "随机播放中" : "顺序播放"}
              >
                <span className="material-symbols-outlined">shuffle</span>
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
                className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
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

            <div className="w-full flex items-center gap-3">
              <span className="text-[10px] text-slate-400 font-medium font-mono min-w-[36px] text-right">
                {formatTime(currentTime)}
              </span>

              {/* Custom Progress Bar */}
              <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full relative overflow-hidden group/progress flex items-center">
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-full transition-all duration-150"
                  style={{ width: `${progressPercent}%` }}
                ></div>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeekChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              <span className="text-[10px] text-slate-400 font-medium font-mono min-w-[36px]">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Right: Actions & Volume */}
          <div className="flex items-center justify-end gap-4 w-1/4 min-w-[80px]">
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
            <div className="relative">
              <button
                onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
                className={`transition-colors hidden md:block ${isPlaylistOpen ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-indigo-600"}`}
                title="播放列表"
              >
                <span className="material-symbols-outlined">playlist_play</span>
              </button>

              {/* Simple Playlist Dropdown */}
              {isPlaylistOpen && playlist.length > 0 && (
                <div className="absolute bottom-full right-0 mb-4 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      当前播放列表
                    </h3>
                    <span className="text-xs text-slate-500">
                      {playlist.length} 首
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
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
                        <div className="w-8 h-8 rounded shrink-0 overflow-hidden relative">
                          <img
                            src={ep.coverUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          {currentEpisode.episodeid === ep.episodeid &&
                            isPlaying && (
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
              className="text-slate-400 hover:text-red-500 transition-colors"
              title="关闭播放器"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      </div>

      {/* Full-screen immersive transcript overlay */}
      {currentEpisode && subtitles.length > 0 && (
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
