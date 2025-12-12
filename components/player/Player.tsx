"use client";
import { usePlayerStore } from "@/store/player-store";
import { useEffect, useRef, useCallback } from "react";
import { debounce, throttle } from "lodash";
import { formatTime } from "@/lib/tools";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import PodcastIcon from "@/components/icons/PodcastIcon";
// import { useTheme } from "next-themes";
import { useSaveProgress } from "@/lib/hooks/useSaveProgress";
import Link from "next/link";

export default function Player() {
  const audioRef = useRef<HTMLAudioElement>(null!);

  const setAudioRef = usePlayerStore((state) => state.setAudioRef);
  const currentEpisode = usePlayerStore((state) => state.currentEpisode);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const setCurrentTime = usePlayerStore((state) => state.setCurrentTime);
  const duration = usePlayerStore((state) => state.duration);
  const setDuration = usePlayerStore((state) => state.setDuration);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const pause = usePlayerStore((state) => state.pause);
  const setCurrentEpisode = usePlayerStore((state) => state.setCurrentEpisode);
  const currentAudioUrl = usePlayerStore((state) => state.currentAudioUrl);
  const setCurrentAudioUrl = usePlayerStore(
    (state) => state.setCurrentAudioUrl,
  );

  // const { theme } = useTheme();
  // const logoSrc = theme === "dark" ? "/static/images/podcast-logo-dark.png" : "/static/images/podcast-logo-light.png";

  const resumeTimeRef = useRef<number | null>(null);

  const { saveToBackend } = useSaveProgress({
    episodeId: currentEpisode?.episodeid || "",
    currentTime,
    isPlaying,
    duration,
  });

  const tryRestoreProgress = useCallback(() => {
    const audio = audioRef.current;
    const targetTime = resumeTimeRef.current;

    if (targetTime !== null && audio && audio.readyState >= 1) {
      console.log(`[Player] 执行进度跳转: ${targetTime}s`);
      audio.currentTime = targetTime;
      setCurrentTime(targetTime);
      resumeTimeRef.current = null;
    }
  }, [setCurrentTime]);

  // 1. 监听切歌：获取历史进度
  useEffect(() => {
    if (!currentEpisode?.episodeid) return;

    resumeTimeRef.current = null;

    const fetchEpisodeStatus = async () => {
      try {
        const res = await fetch(`/api/episode/${currentEpisode.episodeid}`);
        if (res.ok) {
          const data = await res.json();
          const userState = data?.userState;
          const savedProgress = userState?.progressSeconds;
          const isFinished = userState?.isFinished;

          if (isFinished) {
            console.log(`[Player] 该集已标记为完成，重置进度从头播放`);
            resumeTimeRef.current = null;
            setCurrentTime(0);
            if (audioRef.current) audioRef.current.currentTime = 0;
          } else if (typeof savedProgress === "number" && savedProgress > 0) {
            console.log(`[Player] 获取到历史进度: ${savedProgress}s`);
            resumeTimeRef.current = savedProgress;
            tryRestoreProgress();
          } else {
            resumeTimeRef.current = null;
            setCurrentTime(0);
            if (audioRef.current) audioRef.current.currentTime = 0;
          }
        }
      } catch (error) {
        console.error("无法获取历史进度:", error);
      }
    };

    fetchEpisodeStatus();
  }, [currentEpisode?.episodeid, setCurrentTime, tryRestoreProgress]);

  // 初始化 Audio Ref
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) setAudioRef(audio);
  }, [setAudioRef]);

  // 核心播放控制逻辑
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          if (error.name !== "AbortError") {
            console.error("播放音频时出错:", error);
          }
        });
      }
    } else {
      audio.pause();
    }

    const updateTime = () => {
      if (resumeTimeRef.current !== null) return;
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener("timeupdate", updateTime);
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
    };
  }, [isPlaying, currentAudioUrl, setCurrentTime]);

  const handleProgressChange = (newTime: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
      resumeTimeRef.current = null;
    }
  };

  const debouncedSeek = debounce((newTime: number) => {
    handleProgressChange(newTime);
  }, 300);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      tryRestoreProgress();
    };

    const handleCanPlay = () => {
      tryRestoreProgress();
    };

    const handleEnded = () => {
      if (currentEpisode?.episodeid) {
        saveToBackend(audio.duration, true, true);
      }
      pause();
      setCurrentTime(0);
      resumeTimeRef.current = null;
      setCurrentEpisode(null);
      setCurrentAudioUrl("");
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [
    pause,
    setCurrentTime,
    setCurrentEpisode,
    setCurrentAudioUrl,
    saveToBackend,
    currentEpisode,
    setDuration,
    tryRestoreProgress,
  ]);

  const throttledActiveUpdate = useRef(
    throttle(() => {
      fetch("/api/auth/update-activity", {
        method: "POST",
        keepalive: true,
      });
    }, 60000),
  );

  return (
    <div className="flex items-center w-full gap-4 px-2">
      {/* 1. 封面与基本信息区域 */}
      <div className="flex items-center gap-3 w-1/3 min-w-[140px] max-w-[200px]">
        {currentEpisode ? (
          <Link
            href={`/episode/${currentEpisode.episodeid}`}
            className="relative group shrink-0 block cursor-pointer"
            title="进入精读模式"
          >
            <div className="w-12 h-12 rounded-md overflow-hidden shadow-sm border border-base-300/50">
              <img
                src={currentEpisode.coverUrl}
                alt="封面"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md backdrop-blur-[1px]">
              <DocumentTextIcon className="w-5 h-5 text-white" />
            </div>
          </Link>
        ) : (
          <div className="w-12 h-12 rounded-md bg-base-200 flex items-center justify-center text-base-content/20">
            <PodcastIcon size={24} fill="fill-current" />
          </div>
        )}

        <div className="flex flex-col min-w-0 justify-center">
          {currentEpisode ? (
            <Link
              href={`/episode/${currentEpisode.episodeid}`}
              className="text-sm font-semibold truncate text-base-content block hover:text-primary transition-colors"
            >
              {currentEpisode.title}
            </Link>
          ) : (
            <span className="text-sm font-semibold truncate text-base-content block">
              未播放
            </span>
          )}

          <span className="text-xs text-base-content/60 truncate block">
            {currentEpisode?.podcast?.title || "选择一集开始收听"}
          </span>
        </div>
      </div>

      {/* 2. 进度条区域 */}
      <div className="flex flex-col flex-1 justify-center gap-1">
        <div className="flex items-center gap-3 w-full">
          <span className="text-xs text-base-content/50 font-mono min-w-[40px] text-right">
            {formatTime(currentTime)}
          </span>

          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={(e) => debouncedSeek(Number(e.target.value))}
            onMouseUp={(e) =>
              handleProgressChange(Number(e.currentTarget.value))
            }
            onTouchEnd={(e) =>
              handleProgressChange(Number(e.currentTarget.value))
            }
            disabled={!currentEpisode}
            className={`range range-xs w-full ${
              currentEpisode
                ? "range-primary cursor-pointer"
                : "range-disabled opacity-50"
            }`}
          />

          <span className="text-xs text-base-content/50 font-mono min-w-[40px]">
            {formatTime(duration || 0)}
          </span>
        </div>
      </div>

      <audio
        ref={audioRef}
        // [修复] 如果 currentAudioUrl 为空字符串，传递 undefined 以避免浏览器请求当前页面
        src={currentAudioUrl || undefined}
        onLoadedData={(e) => {
          setDuration(e.currentTarget.duration);
          fetch("/api/auth/update-activity", {
            method: "POST",
            keepalive: true,
          });
        }}
        onEnded={() => setCurrentTime(0)}
        onTimeUpdate={() => {
          throttledActiveUpdate.current();
        }}
        onPlay={() => {
          fetch("/api/auth/update-activity", {
            method: "POST",
            keepalive: true,
          });
        }}
        onError={(e) => console.error("音频错误:", e.currentTarget.error)}
      />
    </div>
  );
}
