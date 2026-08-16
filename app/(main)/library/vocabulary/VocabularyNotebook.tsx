"use client";

import React from "react";
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 xl:py-8 space-y-6 xl:space-y-8 font-sans">
      <VocabularyStats hookOptions={hookOptions} />
      <VocabularyControls hookOptions={hookOptions} />
      <VocabularyList hookOptions={hookOptions} />
      <ReviewModal hookOptions={hookOptions} />
    </div>
  );
};

export default VocabularyNotebook;
