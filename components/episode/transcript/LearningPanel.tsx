"use client";

import React, { useState } from "react";
import { Episode } from "@/core/episode/episode.entity";

export interface EpisodeVocabItem {
  vocabularyid: number;
  word: string;
  definition: string | null;
  translation: string | null;
  contextSentence: string | null;
  timestamp: number | null;
  speakUrl: string | null;
}

interface LearningPanelProps {
  episode: Episode;
  vocabulary: EpisodeVocabItem[];
  isLoading: boolean;
  isLoggedIn: boolean;
  onWordClick: (
    word: string,
    contextEn: string,
    contextZh: string,
    timestamp: number,
  ) => void;
  onJump: (t: number) => void;
  onViewDetail: () => void;
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

function formatSec(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function LearningPanel({
  episode,
  vocabulary,
  isLoading,
  isLoggedIn,
  onWordClick,
  onJump,
  onViewDetail,
}: LearningPanelProps) {
  const [tab, setTab] = useState<"vocab" | "info">("vocab");

  const playWordAudio = (e: React.MouseEvent, url?: string | null) => {
    e.stopPropagation();
    if (url) new Audio(url).play().catch(() => {});
  };

  return (
    <div className="sticky top-6 flex flex-col max-h-[calc(100vh-10rem)] rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-e1 overflow-hidden">
      {/* ── Tabs ── */}
      <div className="flex items-center border-b border-ink-100 dark:border-ink-800 px-2">
        {(
          [
            {
              key: "vocab",
              label: `本集生词${isLoggedIn && vocabulary.length > 0 ? ` ${vocabulary.length}` : ""}`,
            },
            { key: "info", label: "本集信息" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative px-4 py-3 text-sm font-bold transition-colors",
              tab === t.key
                ? "text-primary-600 dark:text-primary-400"
                : "text-ink-400 dark:text-ink-500 hover:text-ink-600 dark:hover:text-ink-300",
            )}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute left-3 right-3 -bottom-px h-[2px] rounded-full bg-primary-500" />
            )}
          </button>
        ))}
      </div>

      {/* ── Vocabulary Tab ── */}
      {tab === "vocab" && (
        <div className="flex-1 overflow-y-auto p-2 scrollbar-none">
          {!isLoggedIn ? (
            <div className="flex flex-col items-center justify-center text-center px-6 py-12">
              <span className="material-symbols-outlined text-4xl text-ink-300 dark:text-ink-600 mb-3">
                dictionary
              </span>
              <p className="text-sm text-ink-500 dark:text-ink-400 mb-4">
                登录后即可保存并复习本集生词
              </p>
              <button
                onClick={() => {
                  const modal = document.getElementById(
                    "email_check_modal_box",
                  ) as HTMLDialogElement | null;
                  if (modal) modal.showModal();
                }}
                className="btn btn-primary btn-sm rounded-full px-6"
              >
                立即登录
              </button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="loading loading-spinner loading-md text-primary-500" />
            </div>
          ) : vocabulary.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center px-6 py-12">
              <span className="material-symbols-outlined text-4xl text-ink-300 dark:text-ink-600 mb-3">
                playlist_add
              </span>
              <p className="text-sm text-ink-500 dark:text-ink-400 leading-relaxed">
                还没有本集生词
                <br />
                <span className="text-xs text-ink-400 dark:text-ink-500">
                  点击文中单词即可加入生词本
                </span>
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {vocabulary.map((item) => (
                <li key={item.vocabularyid}>
                  <div
                    className="group flex items-start gap-2 px-3 py-2.5 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-800/60 transition-colors cursor-pointer"
                    onClick={() =>
                      onWordClick(
                        item.word,
                        item.contextSentence || "",
                        item.translation || "",
                        item.timestamp || 0,
                      )
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-serif font-bold text-[15px] text-ink-800 dark:text-ink-100 truncate">
                          {item.word}
                        </span>
                        {item.speakUrl && (
                          <button
                            onClick={(e) => playWordAudio(e, item.speakUrl)}
                            className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-primary-500 transition-all shrink-0"
                            title="播放发音"
                          >
                            <span className="material-symbols-outlined text-base">
                              volume_up
                            </span>
                          </button>
                        )}
                      </div>
                      {item.definition && (
                        <p className="text-xs text-ink-400 dark:text-ink-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {item.definition.split("\n")[0]}
                        </p>
                      )}
                    </div>
                    {item.timestamp != null && item.timestamp > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onJump(item.timestamp!);
                        }}
                        className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[11px] tabular-nums font-medium text-ink-400 dark:text-ink-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                        title="跳转到该句"
                      >
                        {formatSec(item.timestamp)}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Info Tab ── */}
      {tab === "info" && (
        <div className="flex-1 overflow-y-auto p-5 scrollbar-none">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-ink-200 dark:border-ink-700">
              <img
                src={episode.coverUrl}
                alt={episode.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-ink-900 dark:text-ink-100 leading-snug line-clamp-2">
                {episode.title}
              </h3>
              <p className="text-xs text-ink-400 dark:text-ink-500 mt-1 truncate">
                {episode.podcast?.title || "未知节目"}
              </p>
            </div>
          </div>
          <button
            onClick={onViewDetail}
            className="mt-5 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 text-sm font-bold hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
          >
            查看剧集详情
            <span className="material-symbols-outlined text-base">
              arrow_forward
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
