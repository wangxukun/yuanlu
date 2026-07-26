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
  transcriptMode: "read" | "dictate";
  setTranscriptMode: (mode: "read" | "dictate") => void;
}

export function TranscriptToolbar({
  isPlayingThisEpisode,
  autoScroll,
  setAutoScroll,
  showTranslation,
  setShowTranslation,
  transcriptMode,
  setTranscriptMode,
}: TranscriptToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-ink-200 dark:border-ink-800 sticky top-0 bg-white dark:bg-ink-950 bg-opacity-95 dark:bg-opacity-95 backdrop-blur z-20 py-2">
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

      {/* Mode Switch (Read vs Dictate) */}
      <div className="flex bg-ink-50 dark:bg-ink-900 rounded-lg p-1">
        <button
          onClick={() => setTranscriptMode("read")}
          className={clsx(
            "px-4 py-1.5 text-xs font-semibold rounded-md transition-colors",
            transcriptMode === "read"
              ? "bg-white dark:bg-ink-800 text-primary-600 dark:text-primary-400 shadow-sm"
              : "text-ink-500 hover:text-ink-700 dark:hover:text-ink-300",
          )}
        >
          📖 精读
        </button>
        <button
          onClick={() => setTranscriptMode("dictate")}
          className={clsx(
            "px-4 py-1.5 text-xs font-semibold rounded-md transition-colors",
            transcriptMode === "dictate"
              ? "bg-white dark:bg-ink-800 text-primary-600 dark:text-primary-400 shadow-sm"
              : "text-ink-500 hover:text-ink-700 dark:hover:text-ink-300",
          )}
        >
          ✍️ 听写
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={clsx(
            "btn btn-xs sm:btn-sm btn-ghost gap-1.5 transition-colors",
            autoScroll
              ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20"
              : "text-ink-400 hover:text-ink-600",
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
              ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20"
              : "text-ink-400 hover:text-ink-600",
          )}
        >
          <LanguageIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">译文</span>
        </button>
      </div>
    </div>
  );
}
