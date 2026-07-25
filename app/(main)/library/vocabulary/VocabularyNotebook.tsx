"use client";

import React from "react";
import { useVocabularyNotebook } from "./hooks/useVocabularyNotebook";
import { VocabularyStats } from "./components/VocabularyStats";
import { VocabularyControls } from "./components/VocabularyControls";
import { VocabularyList } from "./components/VocabularyList";
import { ReviewModal } from "./components/ReviewModal";

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
  episodeTitle?: string;
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
