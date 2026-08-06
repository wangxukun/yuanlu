/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { PronunciationStats } from "./components/PronunciationStats";
import { PronunciationList } from "./components/PronunciationList";

interface PronunciationNotebookProps {
  stats: any[];
  errors: any[];
}

export default function PronunciationNotebook({
  stats,
  errors,
}: PronunciationNotebookProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 xl:py-8 space-y-6 xl:space-y-8 font-sans">
      <PronunciationStats stats={stats} errors={errors} />
      <PronunciationList stats={stats} errors={errors} />
    </div>
  );
}
