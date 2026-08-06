"use client";

import React from "react";
import DifficultyBadge from "@/components/ui/DifficultyBadge";
import ProBadge from "@/components/ui/ProBadge";
import Link from "next/link";
import {
  Play,
  Pause,
  Lock,
  Calendar,
  Clock,
  Tv,
  Loader2,
  Headphones,
  Languages,
} from "lucide-react";
import { Episode } from "@/core/episode/episode.entity";
import { formatChineseDate } from "@/lib/tools";

import { useEpisodeSummarize } from "./summarize/useEpisodeSummarize";
import { ActionButtons } from "./summarize/ActionButtons";
import { TranscriptPreviewModal } from "./summarize/TranscriptPreviewModal";
import ImmersiveSpeechPractice from "@/components/voice/ImmersiveSpeechPractice";
import { usePlayerStore } from "@/store/player-store";

export default function EpisodeSummarize({ episode }: { episode: Episode }) {
  const isPracticeOpen = usePlayerStore((s) => s.isPracticeOpen);
  const setIsPracticeOpen = usePlayerStore((s) => s.setIsPracticeOpen);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("practice") === "true") {
        setIsPracticeOpen(true);
      }
    }
  }, [setIsPracticeOpen]);

  const hookOptions = useEpisodeSummarize(episode);
  const {
    isTranslatingTitle,
    translatedTitle,
    isPlayingThis,
    isLocked,
    handleTranslateTitle,
    handlePlay,
  } = hookOptions;

  return (
    <section className="flex flex-col gap-8">
      {/* --- Main Player / Cover Area --- */}
      <div className="w-full">
        <div className="group relative w-full aspect-[16/9] md:aspect-[16/9] overflow-hidden rounded-2xl bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 shadow-sm transition-all hover:shadow-md">
          <img
            src={episode.coverUrl}
            alt={episode.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />

          {/* PRO and Play count badges (top left) */}
          <div className="absolute top-3 left-3 md:top-4 md:left-4 z-10 flex gap-1.5 items-center">
            {episode.isExclusive && <ProBadge size="md" />}
            {episode.playCount !== undefined && (
              <div className="bg-[rgba(20,20,30,0.8)] text-white backdrop-blur-md px-2 py-1 rounded shadow-sm text-xs font-medium flex items-center tracking-wide">
                <Headphones className="w-3.5 h-3.5 mr-1.5 opacity-80" />
                {episode.playCount.toLocaleString()}
              </div>
            )}
          </div>

          {/* Difficulty badge (top right) */}
          {episode.difficulty && (
            <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10">
              <DifficultyBadge level={episode.difficulty} />
            </div>
          )}

          {/* 整面可点击播放 + 右下常驻 56px 播放键 */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={handlePlay}
            aria-label={isPlayingThis ? "暂停" : "播放"}
          />
          <button
            onClick={handlePlay}
            aria-label={isPlayingThis ? "暂停" : "播放"}
            className="absolute bottom-3 right-3 md:bottom-4 md:right-4 z-10 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center shadow-[var(--e3)] transition-all hover:scale-105 active:scale-95"
          >
            {isPlayingThis ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : isLocked ? (
              <Lock className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5 fill-current" />
            )}
          </button>
        </div>
      </div>

      {/* --- Content Details --- */}
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-col gap-2">
          {/* Badges & Meta */}
          <div className="flex flex-wrap gap-4 items-center">
            {episode.tags && episode.tags.length > 0 && (
              <span className="bg-[#1F7A5C]/5 text-[#1F7A5C] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {episode.tags[0].name}
              </span>
            )}
            <span className="text-sm text-ink-500 flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4" />
              {episode.publishAt
                ? formatChineseDate(episode.publishAt)
                : "未知日期"}
            </span>
            <span className="text-sm text-ink-500 flex items-center gap-1.5 font-medium">
              <Clock className="w-4 h-4" />
              {typeof episode.duration === "number"
                ? `${Math.floor(episode.duration / 60)}分钟`
                : episode.duration}
            </span>
          </div>

          {/* Title */}
          <div className="flex items-start justify-between gap-4 group/title">
            <h1 className="text-xl md:text-2xl font-bold text-ink-900 dark:text-ink-50 leading-tight">
              {episode.title}
              {translatedTitle && (
                <span className="block text-lg font-medium text-ink-600 dark:text-ink-300 mt-2">
                  {translatedTitle}
                </span>
              )}
            </h1>
            <button
              onClick={handleTranslateTitle}
              disabled={isTranslatingTitle}
              className={`p-2 rounded-xl transition-all shrink-0 ${
                translatedTitle
                  ? "bg-[#1F7A5C]/10 text-[#1F7A5C]"
                  : "text-ink-400 hover:text-[#1F7A5C] hover:bg-[#1F7A5C]/5 md:opacity-0 md:group-hover/title:opacity-100"
              }`}
              title="翻译"
            >
              {isTranslatingTitle ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Languages className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Podcast Title */}
          <Link
            href={`/podcast/${episode.podcastid}`}
            className="text-[#1F7A5C] font-bold text-lg hover:underline transition-all flex items-center gap-2"
          >
            <Tv className="w-5 h-5" />
            {episode.podcast?.title || "远路英语"}
          </Link>
        </div>

        {/* Action Row */}
        <ActionButtons hookOptions={hookOptions} />
      </div>

      {/* Bilingual Transcript Preview & Intercept Modal */}
      <TranscriptPreviewModal episode={episode} hookOptions={hookOptions} />

      {/* Full-screen immersive speech practice overlay */}
      <ImmersiveSpeechPractice
        isOpen={isPracticeOpen}
        onClose={() => setIsPracticeOpen(false)}
        episode={episode}
      />
    </section>
  );
}
