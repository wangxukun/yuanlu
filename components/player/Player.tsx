"use client";
import { usePlayerStore } from "@/store/player-store";
import { useEffect, useRef, useState } from "react";
import { debounce } from "lodash";
import { formatTime } from "@/app/lib/tools";

export default function Player() {
  const {
    isPlaying,
    currentTime,
    duration,
    currentEpisode,
    togglePlay,
    setCurrentTime,
    setDuration,
  } = usePlayerStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [bufferedPercent, setBufferedPercent] = useState(0);

  // 处理播放状态的切换
  useEffect(() => {
    if (audioRef.current) {
      // isPlaying ? audioRef.current.play() : audioRef.current.pause();
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.play();
        } else {
          audioRef.current.pause();
        }
      }
    }
  }, [isPlaying]);

  // 处理进度条的更改
  const handleProgressChange = (newTime: number) => {
    if (audioRef.current) {
      // 暂停状态保持暂停，播放状态保持播放
      const wasPlaying = !audioRef.current.paused;

      // 设置新时间点
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);

      // 恢复播放状态
      if (wasPlaying) {
        audioRef.current.play().catch((error) => {
          console.error("播放失败:", error);
        });
      }
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
    const handleProgress = () => {
      if (!audio) return;

      const buffered = audio.buffered;
      const duration = audio.duration;
      if (buffered.length > 0 && duration > 0) {
        const bufferedEnd = buffered.end(buffered.length - 1);
        setBufferedPercent((bufferedEnd / duration) * 100);
      }
    };

    audio?.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio?.addEventListener("play", handlePlay);
    audio?.addEventListener("pause", handlePause);
    audio?.addEventListener("loadstart", handleLoadStart);
    audio?.addEventListener("stalled", handleStalled);
    audio?.addEventListener("progress", handleProgress);

    return () => {
      audio?.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio?.removeEventListener("play", handlePlay);
      audio?.removeEventListener("pause", handlePause);
      audio?.removeEventListener("loadstart", handleLoadStart);
      audio?.removeEventListener("stalled", handleStalled);
      audio?.removeEventListener("progress", handleProgress);
    };
  }, []);

  return (
    <div className="flex items-center w-full space-x-4">
      {/* 进度条和播放信息 */}
      <div className="flex">
        <div className="w-80 flex-none">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="relative pl-1 top-[8px] w-6">
              {formatTime(currentTime)}
            </span>
            <span className="relative pt-0.5 line-clamp-1 truncate max-w-[30ch]">
              {currentEpisode?.title || "暂无播放"}
            </span>
            <span className="relative pr-1 top-[8px]">
              {formatTime(duration)}
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
              handleProgressChange(percent * duration);
            }}
            className="w-80 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-container]:bg-gradient-to-r
              [&::-webkit-slider-container]:from-blue-200
              [&::-webkit-slider-container]:to-transparent"
            style={{
              "--buffer-percent": `${bufferedPercent}%`,
              background: `linear-gradient(to right, #ddd var(--buffer-percent), transparent var(--buffer-percent))`,
            }}
          />
        </div>

        <div className="flex-initial mt-1">
          <button
            onClick={togglePlay}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* 封面图片 */}
        {currentEpisode && (
          <div className="w-14 flex-initial items-end">
            <img
              src={currentEpisode.imageUrl}
              alt="封面"
              className="w-10 h-10 rounded-lg object-cover"
            />
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedData={(e) => {
          setCurrentTime(0);
          setDuration(e.currentTarget.duration);
        }}
        onError={(e) => console.error("音频加载错误:", e.currentTarget.error)}
        src="/static/audio/20240815.mp3" // 替换实际音频路径
      />
    </div>
  );
}
