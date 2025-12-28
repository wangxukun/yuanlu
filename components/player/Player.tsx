"use client";
import { usePlayerStore } from "@/store/player-store";
import { useEffect, useRef, useCallback } from "react";
import { debounce } from "lodash"; // [修改] 移除了 throttle
import { formatTime } from "@/lib/tools";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import PodcastIcon from "@/components/icons/PodcastIcon";
import { useSaveProgress } from "@/lib/hooks/useSaveProgress";
import Link from "next/link";
import { incrementPlayCount } from "@/lib/actions/analytics-actions";

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

  const resumeTimeRef = useRef<number | null>(null);
  const loggedEpisodeIdRef = useRef<string | null>(null);

  // [新增] 用于累加未上报的收听时长 (秒)
  const unsentSecondsRef = useRef<number>(0);

  const { saveToBackend } = useSaveProgress({
    episodeId: currentEpisode?.episodeid || "",
    currentTime,
    isPlaying,
    duration,
  });

  // [新增] 核心上报逻辑：发送收听时长到后端
  const reportListeningTime = useCallback(async (seconds: number) => {
    if (seconds <= 0) return;

    // 开发环境日志，方便观察心跳
    if (process.env.NODE_ENV === "development") {
      console.log(`[PlayerStats] 上报收听时长: +${seconds}s`);
    }

    try {
      await fetch("/api/auth/update-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds }), // 发送增量秒数
        keepalive: true, // 确保页面关闭时请求能发出
      });
    } catch (e) {
      console.error("Failed to report listening time", e);
    }
  }, []);

  // [新增] 监听播放状态，进行计时和心跳上报
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying) {
      // 1. 开始播放：启动计时器
      interval = setInterval(() => {
        unsentSecondsRef.current += 1;

        // 2. 达到阈值 (例如 30秒) 自动上报一次
        if (unsentSecondsRef.current >= 30) {
          reportListeningTime(unsentSecondsRef.current);
          unsentSecondsRef.current = 0;
        }
      }, 1000);
    }

    // 清理函数：当暂停、组件卸载、或 isPlaying 变 false 时触发
    return () => {
      clearInterval(interval);
      // 3. 暂停/停止时：将剩余未上报的时间立即发送
      if (unsentSecondsRef.current > 0) {
        reportListeningTime(unsentSecondsRef.current);
        unsentSecondsRef.current = 0;
      }
    };
  }, [isPlaying, reportListeningTime]);

  // [新增] 页面关闭/刷新前的兜底上报
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (unsentSecondsRef.current > 0) {
        // 注意：这里不能使用 keepalive 以外的复杂逻辑，直接发请求
        const blob = new Blob(
          [JSON.stringify({ seconds: unsentSecondsRef.current })],
          { type: "application/json" },
        );
        navigator.sendBeacon("/api/auth/update-activity", blob);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // --- 原有的恢复进度逻辑 ---
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

  // 2. 监听切歌并播放：增加播放量统计 (Total Plays)
  useEffect(() => {
    if (
      currentEpisode &&
      isPlaying &&
      currentEpisode.episodeid !== loggedEpisodeIdRef.current
    ) {
      const podcastId =
        currentEpisode.podcastid || currentEpisode.podcast?.podcastid || "";
      incrementPlayCount(currentEpisode.episodeid, podcastId);
      loggedEpisodeIdRef.current = currentEpisode.episodeid;
    }
  }, [currentEpisode?.episodeid, isPlaying, currentEpisode]);

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
      setCurrentTime(0); // 这里设置 0 是安全的，因为 isPlaying 已经 false
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

  // [修改] 移除了原有的 throttledActiveUpdate 逻辑，因为现在由上面的 useEffect 接管了

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
        src={currentAudioUrl || undefined}
        onLoadedData={(e) => {
          setDuration(e.currentTarget.duration);
          // [修改] 移除了 onLoadedData 里的 fetch 更新，因为没必要刚加载就更新活跃时间，依靠播放时的心跳即可
        }}
        // onEnded={() => setCurrentTime(0)}
        // [修改] 移除了 onTimeUpdate 中的 throttledActiveUpdate
        onPlay={() => {
          // [修改] 移除了 onPlay 中的 fetch，因为 useEffect 会在 playing 变 true 时自动启动计时器
        }}
        onError={(e) => console.error("音频错误:", e.currentTarget.error)}
      />
    </div>
  );
}
