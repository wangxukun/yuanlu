"use client";

import React, {
  memo,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { PlayCircleIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { ProcessedSubtitle } from "./types";

interface DictationItemProps {
  sub: ProcessedSubtitle;
  isActive: boolean;
  isPlaying: boolean;
  showTranslation: boolean;
  onJump: (time: number) => void;
  onSuccess: () => void; // Triggered when dictation is fully correct
}

export const DictationItem = memo(function DictationItem({
  sub,
  isActive,
  isPlaying,
  showTranslation,
  onJump,
  onSuccess,
}: DictationItemProps) {
  const [inputValue, setInputValue] = useState("");
  const [errorCount, setErrorCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input automatically when it becomes active
  useEffect(() => {
    if (isActive && inputRef.current) {
      // Small delay to ensure render is complete
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setInputValue("");
      setErrorCount(0);
    }
  }, [isActive, sub.id]);

  // Basic tokenization: split by spaces, keep punctuation attached to words for simpler matching
  const targetWords = useMemo(() => {
    return sub.textEn
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
  }, [sub.textEn]);

  const clean = useCallback(
    (s: string) => s.toLowerCase().replace(/[.,!?;:"()]/g, ""),
    [],
  );

  const inputWords = useMemo(() => {
    const rawInput = inputValue.replace(/\s+/g, "");
    const words: string[] = [];
    let cursor = 0;
    for (let i = 0; i < targetWords.length; i++) {
      const tLen = clean(targetWords[i]).length;
      if (tLen === 0) {
        words.push("");
        continue;
      }
      if (cursor >= rawInput.length) {
        break;
      }
      const chunk = rawInput.slice(cursor, cursor + tLen);
      words.push(chunk);
      cursor += chunk.length;
    }
    return words;
  }, [inputValue, targetWords, clean]);

  // Determine if fully correct
  const isCorrect = useMemo(() => {
    if (inputWords.length !== targetWords.length) return false;
    return targetWords.every((tw, i) => {
      const cw = clean(tw);
      if (cw.length === 0) return true;
      return cw === (inputWords[i] || "").toLowerCase();
    });
  }, [inputWords, targetWords, clean]);

  useEffect(() => {
    if (isCorrect) {
      onSuccess();
    }
  }, [isCorrect, onSuccess]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Optional: check if correct on Enter, or provide hint
      if (!isCorrect) {
        setErrorCount((prev) => prev + 1);
      } else {
        onSuccess();
      }
    }
  };

  return (
    <div
      id={`subtitle-${sub.id}`}
      data-active={isActive}
      className={clsx(
        "group relative rounded-xl p-2 pl-0 pr-0 sm:p-4 transition-all duration-200 sm:border-l-[3px]",
        isActive
          ? "bg-primary-50 dark:bg-primary-900/20 border-primary-500 shadow-e2 transform scale-[1.02] z-10"
          : "bg-transparent border-transparent opacity-50",
      )}
      onClick={() => {
        if (isActive && inputRef.current) {
          inputRef.current.focus();
        }
      }}
    >
      <div className="flex gap-2 sm:gap-4 items-start">
        <button
          onClick={() => onJump(sub.start)}
          className={clsx(
            "mt-1.5 flex-shrink-0 transition-all duration-200 transform",
            isActive
              ? "text-primary-600 scale-110 opacity-100"
              : "text-ink-300",
          )}
          aria-label="Play segment"
        >
          {isActive && isPlaying ? (
            <div className="relative w-6 h-6 flex items-center justify-center">
              <span className="loading loading-bars loading-xs"></span>
            </div>
          ) : (
            <PlayCircleIcon className="w-7 h-7" />
          )}
        </button>

        <div className="flex-1 min-w-0 relative">
          {/* Hidden Input for capturing keystrokes */}
          {isActive && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="absolute inset-0 w-full h-full opacity-0 cursor-text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
          )}

          {/* Rendered Dictation UI */}
          <p
            className={clsx(
              "font-serif text-xl sm:text-2xl leading-[1.85] tracking-wide",
              "text-ink-700 dark:text-ink-200 font-medium",
            )}
          >
            {targetWords.map((targetWord, i) => {
              const inputWord = inputWords[i];
              const cw = clean(targetWord);
              const isPunctuationOnly = cw.length === 0;

              const isMatch =
                isPunctuationOnly ||
                (inputWord !== undefined &&
                  inputWord.length === cw.length &&
                  inputWord.toLowerCase() === cw);
              const isError =
                !isPunctuationOnly &&
                inputWord !== undefined &&
                inputWord.length === cw.length &&
                inputWord.toLowerCase() !== cw;

              // Force show if error count >= 3
              const showHint = errorCount >= 3;

              if (isMatch) {
                return (
                  <span
                    key={i}
                    className="inline mr-2 text-primary-600 dark:text-primary-400 font-bold"
                  >
                    {targetWord}
                  </span>
                );
              }

              if (isError) {
                return (
                  <span key={i} className="inline mr-2 relative group">
                    <span className="text-error line-through decoration-2">
                      {inputWord}
                    </span>
                    {showHint && (
                      <span className="absolute -bottom-5 left-0 text-xs text-info-500 whitespace-nowrap">
                        {targetWord}
                      </span>
                    )}
                  </span>
                );
              }

              // Pending state (or partial input)
              return (
                <span
                  key={i}
                  className="inline-block mr-2 border-b-2 border-dashed border-ink-300 dark:border-ink-600 min-w-[40px] h-6 relative align-bottom leading-none"
                >
                  {inputWord !== undefined && inputWord.length > 0 && (
                    <span className="text-ink-700 dark:text-ink-200">
                      {inputWord}
                    </span>
                  )}
                  {showHint &&
                    (inputWord === undefined || inputWord.length === 0) && (
                      <span className="text-info-500 opacity-60 text-sm">
                        {targetWord}
                      </span>
                    )}
                </span>
              );
            })}
          </p>

          <div
            className={clsx(
              "overflow-hidden transition-all duration-200 ease-in-out",
              showTranslation
                ? "max-h-40 opacity-100 mt-4"
                : "max-h-0 opacity-0 mt-0",
            )}
          >
            <p className="font-sans text-sm leading-[1.7] text-ink-600 dark:text-ink-300 font-medium border-t border-ink-200 dark:border-ink-700 pt-2">
              {sub.textCn.replace(/\[SPEAKER_\d+\]:\s*/g, "").trim()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});
