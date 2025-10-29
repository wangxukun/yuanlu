// components/controls/PlayControlBar.tsx
"use client";
import Link from "next/link";
import { FastForward30 } from "@/components/icons";
import { MusicalNoteIcon } from "@heroicons/react/24/outline";
import { PauseIcon, PlayIcon } from "@heroicons/react/24/solid";
import { usePlayerStore } from "@/store/player-store";

export default function PlayControlBar() {
  const { isPlaying, currentEpisode, togglePlay, forward } = usePlayerStore();
  return (
    <div className="md:hidden fixed bottom-1 left-4 right-4 h-[58px] bg-base-100 rounded-2xl shadow-xl border-t border-base-200 z-50">
      <div className="flex items-center justify-between h-full px-4">
        {/* 左侧：播放详情入口 */}
        <Link
          href="/player"
          className="p-2 rounded-full hover:bg-base-200"
          aria-label="打开播放详情"
        >
          <MusicalNoteIcon className="h-6 w-6 text-base-content" />
        </Link>

        {/* 右侧操作区 */}
        {(currentEpisode && (
          <div className="flex items-center space-x-4">
            <button onClick={togglePlay} className="p-2" aria-label="播放/暂停">
              {isPlaying ? (
                <PauseIcon className="h-8 w-8 text-base-content hover:text-primary" />
              ) : (
                <PlayIcon className="h-8 w-8 text-base-content hover:text-primary" />
              )}
            </button>

            {/* 快进控制 */}
            <button
              onClick={forward}
              className="p-2 text-base-content hover:text-primary"
              aria-label="快进30秒"
            >
              <FastForward30 size={48} fill="fill-current" />
            </button>
          </div>
        )) || (
          <div className="flex items-center space-x-4">
            <div className="p-2">
              <PlayIcon className="h-8 w-8 text-base-300" />
            </div>
            {/* 快进控制 */}
            <div className="p-2">
              <FastForward30 size={48} fill="fill-base-300" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
