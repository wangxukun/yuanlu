"use client";
import { usePlayerStore } from "@/store/player-store";
import { PlayIcon, PauseIcon } from "@heroicons/react/24/solid";
import { Backward15, FastForward30 } from "@/components/icons";

export default function PlayControls() {
  const { isPlaying, currentEpisode, togglePlay, forward, backward } =
    usePlayerStore();

  const iconClass =
    "text-base-content/70 hover:text-primary transition-all duration-200 active:scale-90";
  const disabledClass = "text-base-content/20 cursor-not-allowed";

  return (
    <div className="flex items-center gap-4 lg:gap-6">
      {/* 后退 15 秒 - 在 xl 以下隐藏以节省空间 */}
      <button
        onClick={currentEpisode ? backward : undefined}
        disabled={!currentEpisode}
        className={`${currentEpisode ? iconClass : disabledClass} hidden xl:block`}
        title="后退 15 秒"
      >
        <Backward15 size={32} fill="fill-current" />
      </button>

      {/* 播放/暂停按钮 */}
      <button
        onClick={currentEpisode ? togglePlay : undefined}
        disabled={!currentEpisode}
        className={`h-10 w-10 lg:h-12 lg:w-12 flex items-center justify-center rounded-full transition-all duration-300 shadow-md ${
          currentEpisode
            ? "bg-primary text-primary-content hover:bg-primary-focus hover:scale-105 active:scale-95 shadow-primary/30"
            : "bg-base-300 text-base-content/20 cursor-not-allowed"
        }`}
      >
        {isPlaying ? (
          <PauseIcon className="h-6 w-6 lg:h-7 lg:w-7" />
        ) : (
          <PlayIcon className="h-6 w-6 lg:h-7 lg:w-7 pl-1" />
        )}
      </button>

      {/* 前进 30 秒 - 在 xl 以下隐藏 */}
      <button
        onClick={currentEpisode ? forward : undefined}
        disabled={!currentEpisode}
        className={`${currentEpisode ? iconClass : disabledClass} hidden xl:block`}
        title="前进 30 秒"
      >
        <FastForward30 size={32} fill="fill-current" />
      </button>
    </div>
  );
}
