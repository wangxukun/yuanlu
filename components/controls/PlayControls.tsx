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
          <button onClick={backward} className="flex items-center space-x-0.5">
            <Backward15 size={36} fill="fill-slate-500" />
          </button>
        )) || <Backward15 size={36} fill="fill-slate-300" />}
        {/* 播放按钮 */}
        {(currentEpisode && (
          <button
            onClick={togglePlay}
            className="h-10 w-10 flex items-center justify-center"
          >
            {isPlaying ? (
              <PauseIcon className="h-6 w-6 hover:text-slate-600 text-slate-500" />
            ) : (
              <PlayIcon className="h-6 w-6 hover:text-slate-600 text-slate-500" />
            )}
          </button>
        )) || <PlayIcon className="h-6 w-6 text-slate-300" />}
        {/* 前进 30 秒 */}
        {(currentEpisode && (
          <button onClick={forward} className="flex items-center space-x-1">
            <FastForward30 size={36} fill="fill-slate-500" />
          </button>
        )) || <FastForward30 size={36} fill="fill-slate-300" />}
      </div>
    </>
  );
}
