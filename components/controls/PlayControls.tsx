"use client";
import { usePlayerStore } from "@/store/player-store";
import { PlayIcon, PauseIcon } from "@heroicons/react/24/solid";
import { Backward15, FastForward30 } from "@/components/icons";

export default function PlayControls() {
  const { isPlaying, currentEpisode, togglePlay, forward, backward } =
    usePlayerStore();

  return (
    <>
      <div className="flex space-x-4 items-center">
        {/* 后退 15 秒 */}
        {(currentEpisode && (
          <button
            onClick={backward}
            className="flex items-center space-x-0.5 text-base-content hover:text-primary"
          >
            <Backward15 size={36} fill="fill-current" />
          </button>
        )) || <Backward15 size={36} fill="fill-base-300" />}
        {/* 播放按钮 */}
        {(currentEpisode && (
          <button
            onClick={togglePlay}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-base-200 hover:bg-base-300 text-base-content"
          >
            {isPlaying ? (
              <PauseIcon className="h-6 w-6" />
            ) : (
              <PlayIcon className="h-6 w-6" />
            )}
          </button>
        )) || <PlayIcon className="h-6 w-6 text-base-300" />}
        {/* 前进 30 秒 */}
        {(currentEpisode && (
          <button
            onClick={forward}
            className="flex items-center space-x-1 text-base-content hover:text-primary"
          >
            <FastForward30 size={36} fill="fill-current" />
          </button>
        )) || <FastForward30 size={36} fill="fill-base-300" />}
      </div>
    </>
  );
}
