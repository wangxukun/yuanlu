"use client";

import React from "react";
import { useVocabHighlightStore } from "@/store/vocab-highlight-store";

interface VocabularyHighlighterProps {
  text: string;
  className?: string;
  highlightClassName?: string;
}

/**
 * 生词本高亮（复刻自 yuanlu-podcast components/sentence/VocabularyHighlighter）：
 * 以生词构造 \b 词边界正则切分文本，命中的词渲染为 <mark>，
 * title 提示生词本释义。生词数据来自全局只读镜像 store。
 */
export default function VocabularyHighlighter({
  text,
  className = "",
  highlightClassName = "bg-amber-100 text-amber-900 font-bold px-1 py-0.5 rounded border-b-2 border-amber-500 inline-block transition-all dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-600",
}: VocabularyHighlighterProps) {
  const { words } = useVocabHighlightStore();

  if (!text || words.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Create regex from vocabulary words (escaping special regex chars)
  const escapedWords = words
    .map((w) => w.word.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (escapedWords.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const regexPattern = new RegExp(
    `(\\b(?:${escapedWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b)`,
    "gi",
  );

  const parts = text.split(regexPattern);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatched = escapedWords.some(
          (w) => w.toLowerCase() === part.toLowerCase(),
        );

        if (isMatched) {
          const vocabItem = words.find(
            (w) => w.word.toLowerCase() === part.toLowerCase(),
          );

          return (
            <mark
              key={index}
              className={highlightClassName}
              title={`生词本收录：${vocabItem?.definition || "已加入生词本"}`}
            >
              {part}
            </mark>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}
