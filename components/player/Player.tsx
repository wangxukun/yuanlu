"use client";
import { usePlayerStore } from "@/store/player-store";
import { useEffect, useRef } from "react";
import { debounce } from "lodash";
import { formatTime } from "@/app/lib/tools";
import { ArrowsPointingOutIcon } from "@heroicons/react/24/outline";
import PodcastIcon from "@/components/icons/PodcastIcon";
import Image from "next/image";

export default function Player() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const setAudioRef = usePlayerStore((state) => state.setAudioRef);
  const currentEpisode = usePlayerStore((state) => state.currentEpisode);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const setCurrentTime = usePlayerStore((state) => state.setCurrentTime);
  const duration = usePlayerStore((state) => state.duration);
  const setDuration = usePlayerStore((state) => state.setDuration);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const pause = usePlayerStore((state) => state.pause);
  const setCurrentEpisode = usePlayerStore((state) => state.setCurrentEpisode);
  const setCurrentAudioUrl = usePlayerStore(
    (state) => state.setCurrentAudioUrl,
  );

  // 在 useEffect 中添加结束事件处理
  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => {
      pause(); // 调用 store 中的 pause 方法
      setCurrentTime(0); // 重置播放进度
      setCurrentEpisode(null); // 清除当前剧集
      setCurrentAudioUrl(""); // 清除音频 URL
    };
    audio?.addEventListener("ended", handleEnded);
    return () => audio?.removeEventListener("ended", handleEnded);
  }, [pause, setCurrentTime, setCurrentEpisode, setCurrentAudioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      setAudioRef(audioRef.current);
    }
  }, [setAudioRef]);

  // 统一音频控制逻辑
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // 同步播放状态
    if (isPlaying) {
      audio.play();
    } else {
      audio.pause();
    }
    // 同步时间更新
    const updateTime = () => setCurrentTime(audio.currentTime);
    audio.addEventListener("timeupdate", updateTime);
  }, [isPlaying]);

  // 处理进度条的更改
  const handleProgressChange = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // 优化进度条拖动性能（防抖处理）
  const debouncedSeek = debounce((newTime: number) => {
    handleProgressChange(newTime);
  }, 300);

  // 音频元数据加载监听
  useEffect(() => {
    const audio = audioRef.current;

    const handleLoadedMetadata = () => {
      setDuration(audio?.duration || 0);
    };
    const handlePlay = () => setCurrentTime(audio?.currentTime || 0);
    const handlePause = () => setCurrentTime(audio?.currentTime || 0);
    const handleLoadStart = () => console.log("开始加载音频");
    const handleStalled = () => console.warn("音频加载卡顿");
    // const handleProgress = () => {
    //   if (!audio) return;
    //   const buffered = audio.buffered;
    //   const duration = audio.duration;
    //   if (buffered.length > 0 && duration > 0) {
    //     const bufferedEnd = buffered.end(buffered.length - 1);
    //     setBufferedPercent((bufferedEnd / duration) * 100);
    //   }
    // };

    // 音频元数据加载监听
    audio?.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio?.addEventListener("play", handlePlay);
    audio?.addEventListener("pause", handlePause);
    audio?.addEventListener("loadstart", handleLoadStart);
    audio?.addEventListener("stalled", handleStalled);
    // audio?.addEventListener("progress", handleProgress);

    return () => {
      // 移除事件监听器
      audio?.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio?.removeEventListener("play", handlePlay);
      audio?.removeEventListener("pause", handlePause);
      audio?.removeEventListener("loadstart", handleLoadStart);
      audio?.removeEventListener("stalled", handleStalled);
      // audio?.removeEventListener("progress", handleProgress);
    };
  }, []);

  return (
    <div className="group/player flex items-center w-full space-x-0 border-2">
      {/* 封面图片按钮 */}
      <button
        className="flex bg-gray-200 border-r-2 hover:cursor-pointer relative"
        // onMouseEnter={() => setShowHoverIcon(true)}
        // onMouseLeave={() => setShowHoverIcon(false)}
      >
        {/*打鼠标经过按钮，显示提示打开详细页面图标*/}
        {/*{showHoverIcon && (*/}
        {/*  <div className="absolute inset-0 flex items-center justify-center bg-black/20">*/}
        {/*    <ArrowsPointingOutIcon className="w-6 h-6 text-white opacity-70" />*/}
        {/*  </div>*/}
        {/*)}*/}
        <div className="invisible group-hover/player:visible absolute inset-0 flex items-center justify-center bg-black/20">
          <ArrowsPointingOutIcon className="w-6 h-6 text-white opacity-70" />
        </div>
        {currentEpisode ? (
          <div className="w-[48px] flex-initial items-end">
            <img
              src={currentEpisode.coverUrl}
              alt="封面"
              className="w-[48px] h-[48px] object-cover"
            />
          </div>
        ) : (
          <PodcastIcon size={48} fill="fill-slate-300" />
        )}
      </button>
      {/* 进度条和播放信息 */}
      <div className="flex w-full">
        {(currentEpisode && (
          <div className="w-full relative min-h-[48px]">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="invisible group-hover/player:visible relative pl-1 top-[20px] w-6">
                {formatTime(currentTime)}
              </span>
              <span className="relative pt-1 font-bold line-clamp-1 truncate max-w-[30ch]">
                {currentEpisode?.title || "暂无播放"}
              </span>
              <span className="invisible group-hover/player:visible relative pr-1 top-[20px]">
                {formatTime(duration || 0)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={(e) => debouncedSeek(Number(e.target.value))}
              onMouseUp={(e) =>
                handleProgressChange(Number(e.currentTarget.value))
              }
              // 添加触摸事件支持
              onTouchEnd={(e) =>
                handleProgressChange(Number(e.currentTarget.value))
              }
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                handleProgressChange(percent * duration || 0);
              }}
              className="absolute bottom-0 w-full h-0.5 bg-gray-200 rounded-full cursor-pointer appearance-none
    /* 基础样式 */
    [--thumb-size:0px]
    group-hover/player:[--thumb-size:8px]
    /* Webkit 浏览器 */
    [&::-webkit-slider-thumb]:appearance-none
    [&::-webkit-slider-thumb]:h-(--thumb-size)
    [&::-webkit-slider-thumb]:w-(--thumb-size)
    [&::-webkit-slider-thumb]:rounded-full
    [&::-webkit-slider-thumb]:bg-black
    [&::-webkit-slider-thumb]:transition-all
    [&::-webkit-slider-thumb]:duration-200
    /* Firefox 浏览器 */
    [&::-moz-range-thumb]:appearance-none
    [&::-moz-range-thumb]:h-(--thumb-size)
    [&::-moz-range-thumb]:w-(--thumb-size)
    [&::-moz-range-thumb]:rounded-full
    [&::-moz-range-thumb]:bg-black
    [&::-moz-range-thumb]:transition-all
    [&::-moz-range-thumb]:duration-200
    /* Edge 浏览器 */
    [&::-ms-thumb]:appearance-none
    [&::-ms-thumb]:h-(--thumb-size)
    [&::-ms-thumb]:w-(--thumb-size)
    [&::-ms-thumb]:rounded-full
    [&::-ms-thumb]:bg-black
    [&::-ms-thumb]:transition-all
    [&::-ms-thumb]:duration-200"
              style={{
                background: `linear-gradient(
      to right, 
      #000 ${(currentTime / (duration || 1)) * 100}%, 
      #e5e7eb ${(currentTime / (duration || 1)) * 100}%
    )`,
              }}
            />
          </div>
        )) || (
          <div className="flex mx-auto">
            <Image
              src="/static/images/sm-logo-podcasts.png"
              alt="logo"
              width="48"
              height="48"
            />
          </div>
        )}
      </div>
      {/*{currentEpisode && (*/}
      <audio
        ref={audioRef}
        onEnded={() => setCurrentTime(0)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedData={(e) => {
          setCurrentTime(0);
          setDuration(e.currentTarget.duration);
        }}
        onError={(e) => console.error("音频错误:", e.currentTarget.error)}
        // src={currentEpisode.audioUrl}
        // key={currentEpisode.episodeid}
      />
      {/*)}*/}
    </div>
  );
}
