"use client";

import React from "react";
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

export default function EpisodeSummarize({ episode }: { episode: Episode }) {
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
        <div className="group relative w-full aspect-[16/9] md:aspect-[16/9] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
          <img
            src={episode.coverUrl}
            alt={episode.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />

          {/* PRO and Play count badges (top left) */}
          <div className="absolute top-3 left-3 md:top-4 md:left-4 z-10 flex gap-1.5 items-center">
            {episode.isExclusive && (
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-1 rounded shadow-sm font-extrabold text-xs tracking-widest flex items-center">
                👑 PRO
              </div>
            )}
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
              <div
                className={`bg-white/95 px-2.5 py-1 rounded shadow-sm font-extrabold text-sm tracking-wide ${
                  episode.difficulty.includes("A")
                    ? "text-emerald-600"
                    : episode.difficulty.includes("B1")
                      ? "text-blue-600"
                      : episode.difficulty.includes("B2")
                        ? "text-purple-600"
                        : episode.difficulty.includes("C")
                          ? "text-rose-600"
                          : "text-gray-700"
                }`}
              >
                {episode.difficulty}
              </div>
            </div>
          )}

          {/* Play Overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            onClick={handlePlay}
          >
            <button className="bg-[#5830E0] text-white p-5 rounded-full shadow-2xl transform transition-transform hover:scale-110">
              {isPlayingThis ? (
                <Pause className="w-10 h-10 fill-current" />
              ) : isLocked ? (
                <Lock className="w-10 h-10" />
              ) : (
                <Play className="w-10 h-10 ml-1 fill-current" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* --- Content Details --- */}
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-col gap-2">
          {/* Badges & Meta */}
          <div className="flex flex-wrap gap-4 items-center">
            {episode.tags && episode.tags.length > 0 && (
              <span className="bg-[#5830E0]/5 text-[#5830E0] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {episode.tags[0].name}
              </span>
            )}
            <span className="text-sm text-slate-500 flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4" />
              {episode.publishAt
                ? formatChineseDate(episode.publishAt)
                : "未知日期"}
            </span>
            <span className="text-sm text-slate-500 flex items-center gap-1.5 font-medium">
              <Clock className="w-4 h-4" />
              {typeof episode.duration === "number"
                ? `${Math.floor(episode.duration / 60)}分钟`
                : episode.duration}
            </span>
          </div>

          {/* Title */}
          <div className="flex items-start justify-between gap-4 group/title">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-50 leading-tight">
              {episode.title}
              {translatedTitle && (
                <span className="block text-lg font-medium text-slate-600 dark:text-slate-300 mt-2">
                  {translatedTitle}
                </span>
              )}
            </h1>
            <button
              onClick={handleTranslateTitle}
              disabled={isTranslatingTitle}
              className={`p-2 rounded-xl transition-all shrink-0 ${
                translatedTitle
                  ? "bg-[#5830E0]/10 text-[#5830E0]"
                  : "text-slate-400 hover:text-[#5830E0] hover:bg-[#5830E0]/5 md:opacity-0 md:group-hover/title:opacity-100"
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
            className="text-[#5830E0] font-bold text-lg hover:underline transition-all flex items-center gap-2"
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
    </section>
  );
}
