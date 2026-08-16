/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { PronunciationStats } from "./components/PronunciationStats";
import { PronunciationList } from "./components/PronunciationList";

interface PronunciationNotebookProps {
  stats: any[];
  /** 传入的弱项句子：会员为全量，非会员为试用切片 */
  errors: any[];
  isPremium: boolean;
  /** 弱项句子总数（非会员试用时 errors 为切片，总数用于锁定提示） */
  totalErrors: number;
}

export default function PronunciationNotebook({
  stats,
  errors,
  isPremium,
  totalErrors,
}: PronunciationNotebookProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 xl:py-8 space-y-6 xl:space-y-8 font-sans">
      <PronunciationStats
        stats={stats}
        errors={errors}
        totalErrors={totalErrors}
      />
      <PronunciationList
        stats={stats}
        errors={errors}
        isPremium={isPremium}
        totalErrors={totalErrors}
      />
    </div>
  );
}
