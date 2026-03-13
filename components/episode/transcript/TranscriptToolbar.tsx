import React from "react";
import {
  SpeakerWaveIcon,
  PauseCircleIcon,
  ArrowsRightLeftIcon,
  LanguageIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

interface TranscriptToolbarProps {
  isPlayingThisEpisode: boolean;
  autoScroll: boolean;
  setAutoScroll: (val: boolean) => void;
  showTranslation: boolean;
  setShowTranslation: (val: boolean) => void;
}

export function TranscriptToolbar({
  isPlayingThisEpisode,
  autoScroll,
  setAutoScroll,
  showTranslation,
  setShowTranslation,
}: TranscriptToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-base-200 border-opacity-60 sticky top-0 bg-base-100 bg-opacity-95 backdrop-blur z-10 py-2">
      <div className="flex items-center gap-2">
        {isPlayingThisEpisode ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full animate-pulse">
            <SpeakerWaveIcon className="w-3.5 h-3.5" /> 正在精听
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium text-base-content/40 bg-base-200 px-2 py-1 rounded-full">
            <PauseCircleIcon className="w-3.5 h-3.5" /> 点击段落播放
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={clsx(
            "btn btn-xs sm:btn-sm btn-ghost gap-1.5 transition-colors",
            autoScroll
              ? "text-primary bg-primary/5 "
              : "text-base-content text-opacity-40",
          )}
          title="开启/关闭自动跟随滚动"
        >
          <ArrowsRightLeftIcon
            className={clsx("w-3.5 h-3.5", autoScroll && "rotate-90")}
          />
          <span className="hidden sm:inline">跟随</span>
        </button>

        <button
          onClick={() => setShowTranslation(!showTranslation)}
          className={clsx(
            "btn btn-xs sm:btn-sm btn-ghost gap-1.5 transition-colors",
            showTranslation
              ? "text-primary bg-primary/5"
              : "text-base-content/40",
          )}
        >
          <LanguageIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">译文</span>
        </button>
      </div>
    </div>
  );
}
