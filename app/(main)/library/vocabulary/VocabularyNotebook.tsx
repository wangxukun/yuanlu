"use client";

import React from "react";
import Link from "next/link";
import { BookA } from "lucide-react";
import { useVocabularyNotebook } from "./hooks/useVocabularyNotebook";
import { VocabularyStats } from "./components/VocabularyStats";
import { VocabularyControls } from "./components/VocabularyControls";
import { VocabularyList } from "./components/VocabularyList";
import { ReviewModal } from "./components/ReviewModal";

export interface DictData {
  word: string;
  phonetics?: { us?: string; uk?: string };
  audio_urls?: { us?: string; uk?: string };
  inflections?: {
    plural?: string | null;
    past_tense?: string | null;
    present_participle?: string | null;
    third_person_singular?: string | null;
    adjective_form?: string | null;
  };
  definitions?: Array<{
    pos: string;
    meaning_cn: string;
    meaning_en: string;
    cefr_level?: string;
  }>;
  etymology?: {
    prefix?: string | null;
    root?: string | null;
    suffix?: string | null;
    breakdown?: string | null;
    mnemonic?: string | null;
  };
  phrases_and_collocations?: Array<{
    phrase: string;
    meaning_cn: string;
  }>;
  synonyms?: string[];
  antonyms?: string[];
  examples?: Array<{
    en: string;
    cn: string;
    context?: string;
  }>;
}

export interface VocabularyItem {
  vocabularyid: number;
  word: string;
  definition: string | null;
  translation: string | null;
  contextSentence: string | null;
  proficiency: number;
  nextReviewAt: string | null;
  addedDate: string | null;
  speakUrl: string | null;
  webUrl: string | null;
  timestamp: number | null;
  /** 所属剧集 id（原声播放走 /api/episode/audio-proxy） */
  episodeid?: string | null;
  episodeTitle?: string;
  status?: "LEARNING" | "MASTERED";
  dictData?: DictData | null;
}

interface VocabularyNotebookProps {
  vocabularyList: VocabularyItem[];
}

const VocabularyNotebook: React.FC<VocabularyNotebookProps> = ({
  vocabularyList: initialList,
}) => {
  const hookOptions = useVocabularyNotebook(initialList);

  // 全局空状态：账号下从未收藏过任何生词（数据源总数为 0）。
  // 与"搜索/筛选无结果"（stats.total > 0 且 filteredList 为空）严格区分：
  // 前者隐藏统计、筛选与复习入口，渲染中央引导区；后者由 VocabularyList
  // 内的"未找到匹配的生词"占位符承接，顶部交互卡片保持可用。
  const isGlobalEmpty = hookOptions.stats.total === 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 xl:py-8 space-y-6 xl:space-y-8 font-sans">
      <VocabularyStats
        hookOptions={hookOptions}
        isGlobalEmpty={isGlobalEmpty}
      />

      {isGlobalEmpty ? (
        /* 全局空状态引导区：中央提示 + 去发现播客（三端一致） */
        <div className="bg-white dark:bg-ink-900 rounded-2xl border border-ink-100 dark:border-ink-800 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center mx-auto text-gray-400">
            <BookA size={28} strokeWidth={1.75} aria-hidden />
          </div>
          <div className="mt-4 space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-base-content">
              暂无收藏生词
            </h3>
            <p className="text-sm text-base-content/60 leading-relaxed">
              去听听播客积累词汇吧，在剧集的沉浸式逐字稿中点按生词即可一键收藏。
            </p>
          </div>
          <Link
            href="/discover"
            className="btn btn-sm bg-primary-600 hover:bg-primary-500 text-white border-none rounded-xl px-5 mt-5"
          >
            去发现播客
          </Link>
        </div>
      ) : (
        <>
          <VocabularyControls hookOptions={hookOptions} />
          <VocabularyList hookOptions={hookOptions} />
        </>
      )}

      <ReviewModal hookOptions={hookOptions} />
    </div>
  );
};

export default VocabularyNotebook;
