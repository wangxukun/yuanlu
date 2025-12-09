"use client";
import { usePlayerStore } from "@/store/player-store";
import { useEffect, useRef } from "react";
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

  // ----------------------------------------------------------------
  // [新增] 自动保存播放进度
  // ----------------------------------------------------------------
  // 我们直接使用 Store 中的状态，当状态变化时，Hook 内部会自动决定何时保存
  const { saveToBackend } = useSaveProgress({
    // 确保 episodeid 存在，如果当前没有播放集数，传空字符串
    // (Hook 内部有 currentTime > 0 的判断，所以空串通常不会导致错误请求)
    episodeId: currentEpisode?.episodeid || "",
    currentTime,
    isPlaying,
    duration,
  });
  // ----------------------------------------------------------------

  // ----------------------------------------------------------------
  // [新增功能] 切换剧集时，获取用户历史进度并恢复 (Resume Playback)
  // ----------------------------------------------------------------
  useEffect(() => {
    // 如果没有剧集ID，不需要获取
    if (!currentEpisode?.episodeid) return;

    const fetchEpisodeStatus = async () => {
      try {
        console.log(`正在获取剧集状态: ${currentEpisode.title}`);
        const res = await fetch(`/api/episode/${currentEpisode.episodeid}`);

        if (res.ok) {
          const data = await res.json();
          // 检查是否有服务端返回的历史进度
          const savedProgress = data?.userState?.progressSeconds;

          if (typeof savedProgress === "number" && savedProgress > 0) {
            console.log(`恢复播放进度: ${savedProgress}s`);

            // 1. 更新 Store 状态，让进度条 UI 立即跳过去
            setCurrentTime(savedProgress);

            // 2. 更新 Audio 元素 (如果已经加载了 DOM)
            if (audioRef.current) {
              audioRef.current.currentTime = savedProgress;
            }
          }
        }
      } catch (error) {
        console.error("无法同步播放进度:", error);
      }
    };

    fetchEpisodeStatus();

    // 依赖项：仅当 episodeid 变化时执行（即切歌时）
  }, [currentEpisode?.episodeid, setCurrentTime]);

  // ----------------------------------------------------------------

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      // 2. ✅ [新增] 在清空状态前，强制保存“已完成”状态
      // 这里使用 audio.duration 确保进度拉满，传 true 表示 isFinished
      if (currentEpisode?.episodeid) {
        console.log("播放结束，标记为已完成");
        saveToBackend(audio.duration, true);
      }

      pause();
      setCurrentTime(0);
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

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) setAudioRef(audio);
  }, [setAudioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 注意：这里的 play/pause 逻辑可能会和上面的 currentTime 跳转产生竞态
    // 但通常浏览器能处理好：先跳转再播放，或者播放中跳转
    if (isPlaying) {
      audio.play().catch((error) => {
        console.error("播放音频时出错:", error);
      });
    } else {
      audio.pause();
    }

    const updateTime = () => setCurrentTime(audio.currentTime);
    audio.addEventListener("timeupdate", updateTime);
  }, [isPlaying]);

  const handleProgressChange = (newTime: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
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
      // [可选优化] 如果 API 数据回来得比音频加载慢，或者反之，
      // 这里可以再次确认一下 currentTime 是否需要修正，但目前的 useEffect 逻辑通常足够覆盖
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, []);

  /**
   * 刷新用户活动，60秒一次
   * 把 throttledActiveUpdate 放到 useRef 中，让 throttle 永远只创建一次。
   */
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
      {/* 封面区 */}
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

      {/* 内容区 */}
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
        onEnded={() => setCurrentTime(0)}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime);
          throttledActiveUpdate.current();
        }}
        onLoadedData={(e) => {
          // 这里不再强制归零，因为我们可能已经设置了 savedProgress
          // setCurrentTime(0);
          setDuration(e.currentTarget.duration);
          fetch("/api/auth/update-activity", {
            method: "POST",
            keepalive: true,
          });
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
