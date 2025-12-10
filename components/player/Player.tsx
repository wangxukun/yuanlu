"use client";
import { usePlayerStore } from "@/store/player-store";
import { useEffect, useRef, useCallback } from "react";
import { debounce, throttle } from "lodash";
import { formatTime } from "@/lib/tools";
import { ArrowsPointingOutIcon } from "@heroicons/react/24/outline";
import PodcastIcon from "@/components/icons/PodcastIcon";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useSaveProgress } from "@/lib/hooks/useSaveProgress";

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
  const setCurrentAudioUrl = usePlayerStore(
    (state) => state.setCurrentAudioUrl,
  );
  const { theme } = useTheme();

  const logoSrc =
    theme === "dark"
      ? "/static/images/podcast-logo-dark.png"
      : "/static/images/podcast-logo-light.png";

  // [新增] 用于存储待恢复的进度 (信号枪)
  // 只要它不为 null，就说明“正在等待跳转”，此时禁止 timeupdate 更新 UI
  const resumeTimeRef = useRef<number | null>(null);

  // 1. 调用 useSaveProgress
  const { saveToBackend } = useSaveProgress({
    episodeId: currentEpisode?.episodeid || "",
    currentTime,
    isPlaying,
    duration,
  });

  // [新增] 核心函数：尝试执行进度恢复
  const tryRestoreProgress = useCallback(() => {
    const audio = audioRef.current;
    const targetTime = resumeTimeRef.current;

    // 只有当有目标时间，且音频元素存在，且元数据已加载(HAVE_METADATA=1)时才跳转
    if (targetTime !== null && audio && audio.readyState >= 1) {
      console.log(`[Player] 执行进度跳转: ${targetTime}s`);
      audio.currentTime = targetTime;
      setCurrentTime(targetTime);
      resumeTimeRef.current = null; // 解除锁
    }
  }, [setCurrentTime]);

  // ----------------------------------------------------------------
  // [修改]：切歌时，获取历史进度并设置 resumeTimeRef
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!currentEpisode?.episodeid) return;

    // 切歌时先重置锁
    resumeTimeRef.current = null;

    const fetchEpisodeStatus = async () => {
      try {
        const res = await fetch(`/api/episode/${currentEpisode.episodeid}`);
        if (res.ok) {
          const data = await res.json();
          const savedProgress = data?.userState?.progressSeconds;

          if (typeof savedProgress === "number" && savedProgress > 0) {
            console.log("[Player] 切歌正常");
            console.log(`[Player] 获取到历史进度: ${savedProgress}s`);
            // 设置锁，进入“恢复模式”
            resumeTimeRef.current = savedProgress;
            // 尝试跳转（防止音频已经加载完）
            tryRestoreProgress();
          } else {
            console.log("[Player] 切歌不正常");
            console.log("savedProgress:", savedProgress);
            console.log("data:", data);
            // 新的一集，清除锁并归零
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

  // ... (AudioRef 设置逻辑不变)
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) setAudioRef(audio);
  }, [setAudioRef]);

  // [修改] 播放控制与 TimeUpdate 锁逻辑
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch((error) => {
        console.error("播放音频时出错:", error);
      });
    } else {
      audio.pause();
    }

    // [关键] 加锁的 updateTime
    const updateTime = () => {
      // 如果正在等待恢复（Ref有值），则忽略音频传来的 0s，防止 Store 被覆盖
      if (resumeTimeRef.current !== null) return;

      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener("timeupdate", updateTime);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
    };
  }, [isPlaying, setCurrentTime]);

  // [修改] Ended逻辑
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (currentEpisode?.episodeid) {
        saveToBackend(audio.duration, true, true);
      }
      pause();
      setCurrentTime(0);
      resumeTimeRef.current = null; // 清除锁
      setCurrentEpisode(null);
      setCurrentAudioUrl("");
    };

    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("ended", handleEnded);
    };
  }, [
    pause,
    setCurrentTime,
    setCurrentEpisode,
    setCurrentAudioUrl,
    saveToBackend,
    currentEpisode,
  ]);

  const handleProgressChange = (newTime: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
      // 用户手动拖拽，清除恢复锁
      resumeTimeRef.current = null;
    }
  };

  const debouncedSeek = debounce((newTime: number) => {
    handleProgressChange(newTime);
  }, 300);

  // [修改] 元数据加载逻辑：增加跳转尝试
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      // 音频元数据加载完毕，尝试跳转
      tryRestoreProgress();
    };

    // 增加 canplay 事件，双重保险
    const handleCanPlay = () => {
      tryRestoreProgress();
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [tryRestoreProgress, setDuration]);

  const throttledActiveUpdate = useRef(
    throttle(() => {
      fetch("/api/auth/update-activity", {
        method: "POST",
        keepalive: true,
      });
    }, 60000),
  );

  return (
    <div className="group/player flex items-center w-full border border-base-300 bg-base-200 rounded-xl shadow-md overflow-hidden">
      {/* ... 封面区 ... */}
      <button className="relative flex bg-base-200 border-r border-base-300 hover:brightness-110 transition-all">
        <div className="invisible group-hover/player:visible absolute inset-0 flex items-center justify-center bg-black/30">
          <ArrowsPointingOutIcon className="w-6 h-6 text-white opacity-70" />
        </div>
        {currentEpisode ? (
          <div className="w-[48px] h-[48px]">
            <img
              src={currentEpisode.coverUrl}
              alt="封面"
              className="w-full h-full object-cover rounded-none"
            />
          </div>
        ) : (
          <PodcastIcon size={48} fill="fill-gray-300" />
        )}
      </button>

      {/* ... 内容区 ... */}
      <div className="flex-1 flex flex-col justify-center px-2">
        {currentEpisode ? (
          <>
            <div className="flex items-center justify-between text-xs text-base-content/70">
              <span className="invisible group-hover/player:visible pl-1">
                {formatTime(currentTime)}
              </span>
              <span className="font-semibold text-base-content truncate max-w-[30ch] text-sm">
                {currentEpisode?.title || "暂无播放"}
              </span>
              <span className="invisible group-hover/player:visible pr-1">
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
              onTouchEnd={(e) =>
                handleProgressChange(Number(e.currentTarget.value))
              }
              className="range range-xs range-primary mt-1 w-full"
            />
          </>
        ) : (
          <div className="flex justify-center items-center w-full">
            <Image src={logoSrc} alt="logo" width={40} height={40} />
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        onLoadedData={(e) => {
          setDuration(e.currentTarget.duration);
          fetch("/api/auth/update-activity", {
            method: "POST",
            keepalive: true,
          });
        }}
        onEnded={() => setCurrentTime(0)}
        onTimeUpdate={() => {
          // [修改] 这里不再调用 setCurrentTime，只负责心跳
          // 状态更新逻辑已移至 useEffect 中统一管理
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
