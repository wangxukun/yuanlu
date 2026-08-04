import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import {
  BrainCircuit,
  X,
  Volume2,
  ExternalLink,
  RotateCcw,
  Clock,
  CheckCircle,
  Award,
  BookOpen,
  Sparkles,
  Tags,
  Lightbulb,
  Trophy,
  RefreshCcw,
} from "lucide-react";
import { renderContext } from "./ContextRenderer";
import { ReviewQuality, calculateNextReview } from "@/lib/srs";
import { UseVocabularyNotebookReturn } from "../hooks/useVocabularyNotebook";
import { VocabularyItem } from "../VocabularyNotebook";

// ==================== Types & Enums ====================

enum ReviewMode {
  FILL_BLANK = "fill_blank",
  MULTIPLE_CHOICE = "choice",
  CN_TO_EN = "cn_to_en",
  DEF_GUESS = "def_guess",
}

interface ReviewResult {
  vocabularyid: number;
  word: string;
  quality: ReviewQuality;
}

interface ChoiceOption {
  choices: string[];
  correctIndex: number;
}

// ==================== Helpers ====================

function getIntervalLabel(proficiency: number, quality: ReviewQuality): string {
  const { nextReviewAt } = calculateNextReview(proficiency, quality);
  const days = Math.round(
    (nextReviewAt.getTime() - Date.now()) / (1000 * 3600 * 24),
  );
  if (days <= 0) return "今天";
  if (days === 1) return "1天";
  return `${days}天`;
}

function assignMode(item: VocabularyItem, queueLength: number): ReviewMode {
  const available: ReviewMode[] = [];
  if (item.contextSentence) available.push(ReviewMode.FILL_BLANK);
  if (
    queueLength >= 4 &&
    (item.dictData?.definitions?.length || item.definition)
  )
    available.push(ReviewMode.MULTIPLE_CHOICE);
  if (item.dictData?.definitions?.some((d) => d.meaning_cn) || item.definition)
    available.push(ReviewMode.CN_TO_EN);
  if (item.dictData?.definitions?.some((d) => d.meaning_en))
    available.push(ReviewMode.DEF_GUESS);
  if (available.length === 0) available.push(ReviewMode.CN_TO_EN);
  return available[Math.floor(Math.random() * available.length)];
}

function generateChoiceOptions(queue: VocabularyItem[]): ChoiceOption[] {
  return queue.map((item, idx) => {
    const correctDef =
      item.dictData?.definitions?.[0]?.meaning_cn ||
      item.definition ||
      item.word;
    const otherDefs = queue
      .filter((_, i) => i !== idx)
      .map(
        (other) =>
          other.dictData?.definitions?.[0]?.meaning_cn ||
          other.definition ||
          other.word,
      )
      .filter((d) => d && d !== correctDef);
    const shuffled = [...otherDefs].sort(() => Math.random() - 0.5);
    const distractors = shuffled.slice(0, 3);
    while (distractors.length < 3)
      distractors.push(`释义 ${distractors.length + 1}`);
    const allChoices = [correctDef, ...distractors];
    for (let i = allChoices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allChoices[i], allChoices[j]] = [allChoices[j], allChoices[i]];
    }
    return {
      choices: allChoices,
      correctIndex: allChoices.indexOf(correctDef),
    };
  });
}

const MODE_LABELS: Record<ReviewMode, string> = {
  [ReviewMode.FILL_BLANK]: "填空",
  [ReviewMode.MULTIPLE_CHOICE]: "选择",
  [ReviewMode.CN_TO_EN]: "中译英",
  [ReviewMode.DEF_GUESS]: "猜词",
};

// ==================== Main Component ====================

export function ReviewModal({
  hookOptions,
}: {
  hookOptions: UseVocabularyNotebookReturn;
}) {
  const {
    isReviewOpen,
    setIsReviewOpen,
    reviewQueue,
    currentReviewIndex,
    isCardFlipped,
    setIsCardFlipped,
    playContextAudio,
    playingText,
    playAudio,
    isSubmitting,
    handleSRS,
    retryForgotten,
  } = hookOptions;

  const [mounted, setMounted] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [reviewModes, setReviewModes] = useState<ReviewMode[]>([]);
  const [reviewResults, setReviewResults] = useState<ReviewResult[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [choiceOptions, setChoiceOptions] = useState<ChoiceOption[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isInputWrong, setIsInputWrong] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ==================== Effects ====================

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize modes when review starts or queue changes (retry)
  useEffect(() => {
    if (isReviewOpen && reviewQueue.length > 0) {
      setReviewModes(
        reviewQueue.map((item) => assignMode(item, reviewQueue.length)),
      );
      setChoiceOptions(generateChoiceOptions(reviewQueue));
      setReviewResults([]);
      setShowSummary(false);
      setInputValue("");
      setShowHint(false);
      setSelectedChoice(null);
      setIsInputWrong(false);
    }
  }, [isReviewOpen, reviewQueue]);

  // Reset per-card state when advancing
  useEffect(() => {
    setInputValue("");
    setShowHint(false);
    setSelectedChoice(null);
    setIsInputWrong(false);
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [currentReviewIndex]);

  // Keyboard shortcuts (use refs to avoid stale closures)
  const handleQualitySelectRef = useRef<(q: ReviewQuality) => void>(() => {});
  const handleChoiceSelectRef = useRef<(idx: number) => void>(() => {});
  const currentModeRef = useRef<ReviewMode | null>(null);

  const currentItem = reviewQueue[currentReviewIndex];
  const currentMode = reviewModes[currentReviewIndex];
  currentModeRef.current = currentMode;

  const handleQualitySelect = useCallback(
    (quality: ReviewQuality) => {
      const item = reviewQueue[currentReviewIndex];
      if (!item) return;
      setReviewResults((prev) => [
        ...prev,
        { vocabularyid: item.vocabularyid, word: item.word, quality },
      ]);
      handleSRS(quality, () => setShowSummary(true));
    },
    [currentReviewIndex, reviewQueue, handleSRS],
  );
  handleQualitySelectRef.current = handleQualitySelect;

  useEffect(() => {
    if (!isReviewOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (showSummary) return;
      if (e.key === "Escape") {
        setIsReviewOpen(false);
        return;
      }
      const inInput = document.activeElement?.tagName === "INPUT";
      if (!isCardFlipped) {
        if ((e.key === " " || e.key === "Enter") && !inInput) {
          e.preventDefault();
          setIsCardFlipped(true);
        } else if (
          currentModeRef.current === ReviewMode.MULTIPLE_CHOICE &&
          !inInput
        ) {
          const key = e.key.toLowerCase();
          const map: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
          if (key in map) {
            handleChoiceSelectRef.current(map[key]);
          }
        }
      } else {
        if (["1", "2", "3", "4"].includes(e.key) && !isSubmitting) {
          const map: Record<string, ReviewQuality> = {
            "1": ReviewQuality.FORGOT,
            "2": ReviewQuality.HARD,
            "3": ReviewQuality.GOOD,
            "4": ReviewQuality.EASY,
          };
          handleQualitySelectRef.current(map[e.key]);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    isReviewOpen,
    isCardFlipped,
    isSubmitting,
    showSummary,
    setIsReviewOpen,
    setIsCardFlipped,
  ]);

  // Dismiss mobile keyboard when card flips
  useEffect(() => {
    if (isCardFlipped && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [isCardFlipped]);

  // Auto-play audio when card opens (front or back)
  useEffect(() => {
    if (!isReviewOpen || !currentItem || showSummary) return;

    const audioUrl =
      currentItem.dictData?.audio_urls?.uk ||
      currentItem.dictData?.audio_urls?.us;
    if (audioUrl) {
      playAudio(null, audioUrl);
    }
  }, [
    currentReviewIndex,
    isCardFlipped,
    isReviewOpen,
    showSummary,
    currentItem,
    playAudio,
  ]);

  // ==================== Computed ====================

  const progress =
    reviewQueue.length > 0
      ? ((currentReviewIndex + (isCardFlipped ? 1 : 0)) / reviewQueue.length) *
        100
      : 0;

  const intervalPreviews = useMemo(() => {
    if (!currentItem)
      return { forgot: "今天", hard: "1天", good: "3天", easy: "7天" };
    const p = currentItem.proficiency;
    return {
      forgot: getIntervalLabel(p, ReviewQuality.FORGOT),
      hard: getIntervalLabel(p, ReviewQuality.HARD),
      good: getIntervalLabel(p, ReviewQuality.GOOD),
      easy: getIntervalLabel(p, ReviewQuality.EASY),
    };
  }, [currentItem]);

  const summaryStats = useMemo(() => {
    const forgot = reviewResults.filter(
      (r) => r.quality === ReviewQuality.FORGOT,
    ).length;
    const hard = reviewResults.filter(
      (r) => r.quality === ReviewQuality.HARD,
    ).length;
    const good = reviewResults.filter(
      (r) => r.quality === ReviewQuality.GOOD,
    ).length;
    const easy = reviewResults.filter(
      (r) => r.quality === ReviewQuality.EASY,
    ).length;
    return { forgot, hard, good, easy, total: reviewResults.length };
  }, [reviewResults]);

  // ==================== Handlers ====================

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setIsInputWrong(false);
    if (!currentItem) return;
    if (val.toLowerCase().trim() === currentItem.word.toLowerCase().trim()) {
      setIsCardFlipped(true);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!currentItem) return;
      if (
        inputValue.toLowerCase().trim() ===
        currentItem.word.toLowerCase().trim()
      ) {
        setIsCardFlipped(true);
      } else if (inputValue.length > 0) {
        setIsInputWrong(true);
        setTimeout(() => setIsInputWrong(false), 600);
      }
    }
  };

  const handleChoiceSelect = (choiceIdx: number) => {
    const options = choiceOptions[currentReviewIndex];
    if (!options || selectedChoice === options.correctIndex) return;
    if (choiceIdx === options.correctIndex) {
      setSelectedChoice(choiceIdx);
      setTimeout(() => setIsCardFlipped(true), 500);
    } else {
      setSelectedChoice(choiceIdx);
      setTimeout(() => {
        setSelectedChoice(null);
      }, 800);
    }
  };
  handleChoiceSelectRef.current = handleChoiceSelect;

  const handleShowHint = () => {
    if (!currentItem) return;
    setShowHint(true);
    if (!inputValue) setInputValue(currentItem.word[0]);
  };

  const handleRetry = () => {
    const forgottenIds = reviewResults
      .filter((r) => r.quality === ReviewQuality.FORGOT)
      .map((r) => r.vocabularyid);
    setShowSummary(false);
    setReviewResults([]);
    retryForgotten(forgottenIds);
  };

  const handleClose = () => {
    setIsReviewOpen(false);
    setShowSummary(false);
    setReviewResults([]);
  };

  // ==================== Shared Input Component ====================

  const renderWordInput = (placeholder: string) => (
    <>
      <input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
        className={`input input-bordered w-full max-w-xs text-center text-lg font-mono transition-colors ${
          isInputWrong ? "input-error ring-2 ring-error/30" : "input-primary"
        }`}
        autoComplete="off"
        spellCheck={false}
      />
      <button
        onClick={handleShowHint}
        disabled={showHint}
        className="btn btn-sm btn-ghost gap-1.5 text-warning mt-4 disabled:opacity-40"
      >
        <Lightbulb size={14} />
        {showHint && currentItem
          ? `首字母: ${currentItem.word[0].toUpperCase()}`
          : "显示首字母"}
      </button>
    </>
  );

  // ==================== Front Side Renderers ====================

  const renderFillBlank = () => (
    <div className="flex flex-col items-center justify-center min-h-full p-6 sm:p-8">
      <div className="text-[10px] sm:text-xs font-bold text-base-content/40 uppercase tracking-[0.2em] mb-6 sm:mb-8">
        <BookOpen size={14} className="inline mr-1.5 -mt-0.5" />
        补全句子
      </div>
      <div className="text-lg sm:text-xl xl:text-2xl leading-relaxed font-serif text-base-content text-center max-w-lg">
        {renderContext(
          currentItem?.contextSentence,
          currentItem?.word,
          true,
          (word, i) => (
            <input
              key={i}
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              className={`inline-block border-b-2 mx-1 align-bottom bg-transparent text-center focus:outline-none font-bold transition-colors ${
                isInputWrong
                  ? "border-error text-error"
                  : "border-primary text-primary"
              }`}
              style={{
                width: `${Math.max(word.length * 14, 60)}px`,
                fontSize: "inherit",
              }}
              autoComplete="off"
              spellCheck={false}
            />
          ),
        )}
      </div>
      {currentItem?.translation && (
        <div className="text-sm text-base-content/50 mt-4 sm:mt-6 text-center">
          {currentItem.translation}
        </div>
      )}
      <div className="flex items-center gap-3 mt-6 sm:mt-8">
        <button
          onClick={handleShowHint}
          disabled={showHint}
          className="btn btn-sm btn-ghost gap-1.5 text-warning disabled:opacity-40"
        >
          <Lightbulb size={14} />
          {showHint && currentItem
            ? `首字母: ${currentItem.word[0].toUpperCase()}`
            : "显示首字母"}
        </button>
        {currentItem?.contextSentence && (
          <button
            onClick={(e) => playContextAudio(e, currentItem.contextSentence)}
            className={`btn btn-sm btn-circle btn-ghost ${
              playingText === currentItem.contextSentence
                ? "text-primary animate-pulse"
                : "text-base-content/40"
            }`}
          >
            <Volume2 size={16} />
          </button>
        )}
      </div>
    </div>
  );

  const renderMultipleChoice = () => {
    const options = choiceOptions[currentReviewIndex];
    if (!options) return renderCnToEn();
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6 sm:p-8">
        <div className="text-[10px] sm:text-xs font-bold text-base-content/40 uppercase tracking-[0.2em] mb-6 sm:mb-8">
          <Tags size={14} className="inline mr-1.5 -mt-0.5" />
          选择正确释义
        </div>
        <h2 className="text-3xl sm:text-4xl xl:text-5xl font-bold text-primary mb-2">
          {currentItem?.word}
        </h2>
        {currentItem?.dictData?.phonetics?.us && (
          <div className="flex items-center gap-2 text-sm text-base-content/50 font-mono mb-8">
            {currentItem.dictData.phonetics.us}
            {currentItem.dictData?.audio_urls?.us && (
              <button
                onClick={(e) =>
                  playAudio(e, currentItem.dictData!.audio_urls!.us)
                }
                className="btn btn-xs btn-circle btn-ghost text-primary"
              >
                <Volume2 size={12} />
              </button>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
          {options.choices.map((choice, idx) => {
            const isSelected = selectedChoice === idx;
            const isCorrect = idx === options.correctIndex;
            let cls =
              "btn btn-outline btn-block justify-start text-left h-auto py-3 px-4 font-normal text-sm no-animation";
            if (isSelected && isCorrect)
              cls += " btn-success text-success-content";
            if (isSelected && !isCorrect)
              cls += " btn-error text-error-content";
            return (
              <button
                key={idx}
                onClick={() => handleChoiceSelect(idx)}
                className={cls}
                disabled={
                  selectedChoice !== null &&
                  selectedChoice === options.correctIndex
                }
              >
                <span className="text-xs font-bold mr-2 opacity-50">
                  {String.fromCharCode(65 + idx)}
                </span>
                {choice}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCnToEn = () => (
    <div className="flex flex-col items-center justify-center min-h-full p-6 sm:p-8">
      <div className="text-[10px] sm:text-xs font-bold text-base-content/40 uppercase tracking-[0.2em] mb-6 sm:mb-8">
        <RefreshCcw size={14} className="inline mr-1.5 -mt-0.5" />
        中译英
      </div>
      <div className="text-center mb-8 space-y-3">
        {currentItem?.dictData?.definitions?.map((def, idx) => (
          <div key={idx}>
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded mr-2">
              {def.pos}
            </span>
            <span className="text-lg sm:text-xl font-medium text-base-content">
              {def.meaning_cn}
            </span>
          </div>
        )) || (
          <div className="text-lg sm:text-xl font-medium text-base-content">
            {currentItem?.definition || "请输入对应的英文单词"}
          </div>
        )}
      </div>
      {renderWordInput("输入英文单词...")}
    </div>
  );

  const renderDefGuess = () => {
    const enDef = currentItem?.dictData?.definitions?.find((d) => d.meaning_en);
    if (!enDef) return renderCnToEn();
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6 sm:p-8">
        <div className="text-[10px] sm:text-xs font-bold text-base-content/40 uppercase tracking-[0.2em] mb-6 sm:mb-8">
          <Sparkles size={14} className="inline mr-1.5 -mt-0.5" />
          看释义猜词
        </div>
        <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-xs font-bold rounded mb-3">
          {enDef.pos}
        </span>
        <p className="text-base sm:text-lg leading-relaxed text-base-content/80 text-center max-w-md mb-8 italic font-serif">
          &ldquo;{enDef.meaning_en}&rdquo;
        </p>
        {renderWordInput("输入英文单词...")}
      </div>
    );
  };

  const renderFront = () => {
    if (!currentItem) return null;
    switch (currentMode) {
      case ReviewMode.FILL_BLANK:
        return renderFillBlank();
      case ReviewMode.MULTIPLE_CHOICE:
        return renderMultipleChoice();
      case ReviewMode.CN_TO_EN:
        return renderCnToEn();
      case ReviewMode.DEF_GUESS:
        return renderDefGuess();
      default:
        return renderCnToEn();
    }
  };

  // ==================== Back Side ====================

  const renderBack = () => {
    if (!currentItem) return null;
    const dict = currentItem.dictData;
    return (
      <div className="p-5 sm:p-6 xl:p-8 space-y-5">
        {/* Word + Phonetics + Audio */}
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-2 break-words">
            {currentItem.word}
          </h2>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {dict?.phonetics?.us && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-primary uppercase">
                  US
                </span>
                <span className="text-sm font-mono text-base-content/60">
                  {dict.phonetics.us}
                </span>
                {dict?.audio_urls?.us && (
                  <button
                    onClick={(e) => playAudio(e, dict.audio_urls!.us)}
                    className="btn btn-xs btn-circle btn-ghost text-primary"
                  >
                    <Volume2 size={12} />
                  </button>
                )}
              </div>
            )}
            {dict?.phonetics?.uk && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-secondary uppercase">
                  UK
                </span>
                <span className="text-sm font-mono text-base-content/60">
                  {dict.phonetics.uk}
                </span>
                {dict?.audio_urls?.uk && (
                  <button
                    onClick={(e) => playAudio(e, dict.audio_urls!.uk)}
                    className="btn btn-xs btn-circle btn-ghost text-secondary"
                  >
                    <Volume2 size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
          {currentItem.webUrl && (
            <a
              href={currentItem.webUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary/60 hover:text-primary mt-2 transition-colors"
            >
              <ExternalLink size={12} /> 查看词典
            </a>
          )}
        </div>

        {/* Definitions */}
        {dict?.definitions && dict.definitions.length > 0 && (
          <div className="bg-base-200/50 dark:bg-ink-800/50 rounded-xl p-4 space-y-2.5">
            <h4 className="text-[10px] font-bold text-base-content/40 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen size={12} /> 释义
            </h4>
            {dict.definitions.map((def, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded shrink-0 mt-0.5">
                  {def.pos}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-base-content">
                    {def.meaning_cn}
                  </div>
                  {def.meaning_en && (
                    <div className="text-xs text-base-content/50 mt-0.5 leading-relaxed">
                      {def.meaning_en}
                    </div>
                  )}
                </div>
                {def.cefr_level && (
                  <span className="px-1.5 py-0.5 bg-info/10 text-info text-[9px] font-bold rounded uppercase shrink-0">
                    {def.cefr_level}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Context Sentence */}
        {currentItem.contextSentence && (
          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-bold text-base-content/40 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} /> 原声出处
              </h4>
              <button
                onClick={(e) =>
                  playContextAudio(e, currentItem.contextSentence)
                }
                className={`btn btn-xs btn-circle btn-ghost ${
                  playingText === currentItem.contextSentence
                    ? "text-primary animate-pulse"
                    : "text-base-content/40"
                }`}
              >
                <Volume2 size={14} />
              </button>
            </div>
            <div className="text-sm font-medium leading-relaxed">
              {renderContext(currentItem.contextSentence, currentItem.word)}
            </div>
            {currentItem.translation && (
              <div className="text-xs text-base-content/50 mt-2">
                {currentItem.translation}
              </div>
            )}
          </div>
        )}

        {/* Etymology */}
        {dict?.etymology &&
          (dict.etymology.breakdown || dict.etymology.mnemonic) && (
            <div className="bg-warning/5 dark:bg-warning/10 rounded-xl p-4">
              <h4 className="text-[10px] font-bold text-base-content/40 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Lightbulb size={12} className="text-warning" /> 词源记忆
              </h4>
              <div className="space-y-1 text-xs text-base-content/60">
                {dict.etymology.prefix && (
                  <div>
                    <span className="font-bold">前缀:</span>{" "}
                    {dict.etymology.prefix}
                  </div>
                )}
                {dict.etymology.root && (
                  <div>
                    <span className="font-bold">词根:</span>{" "}
                    {dict.etymology.root}
                  </div>
                )}
                {dict.etymology.suffix && (
                  <div>
                    <span className="font-bold">后缀:</span>{" "}
                    {dict.etymology.suffix}
                  </div>
                )}
              </div>
              {dict.etymology.mnemonic && (
                <div className="text-sm text-base-content/70 mt-2 leading-relaxed">
                  💡 {dict.etymology.mnemonic}
                </div>
              )}
            </div>
          )}

        {/* Phrases */}
        {dict?.phrases_and_collocations &&
          dict.phrases_and_collocations.length > 0 && (
            <div className="bg-base-200/30 dark:bg-ink-800/30 rounded-xl p-4">
              <h4 className="text-[10px] font-bold text-base-content/40 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Tags size={12} /> 搭配短语
              </h4>
              <div className="flex flex-wrap gap-2">
                {dict.phrases_and_collocations.map((p, idx) => (
                  <div
                    key={idx}
                    className="text-xs bg-white dark:bg-ink-900 px-2.5 py-1.5 rounded-lg shadow-sm ring-1 ring-base-200 dark:ring-base-content/10"
                  >
                    <span className="font-medium text-base-content">
                      {p.phrase}
                    </span>
                    <span className="text-base-content/50 ml-1.5">
                      {p.meaning_cn}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Synonyms & Antonyms */}
        {(dict?.synonyms?.length || dict?.antonyms?.length) && (
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {dict?.synonyms && dict.synonyms.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-success uppercase">
                  同义
                </span>
                {dict.synonyms.map((s, i) => (
                  <span
                    key={i}
                    className="text-xs text-base-content/70 bg-success/5 px-2 py-0.5 rounded"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            {dict?.antonyms && dict.antonyms.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-error uppercase">
                  反义
                </span>
                {dict.antonyms.map((a, i) => (
                  <span
                    key={i}
                    className="text-xs text-base-content/70 bg-error/5 px-2 py-0.5 rounded"
                  >
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ==================== Summary Page ====================

  const renderSummary = () => (
    <div className="flex flex-col items-center justify-center min-h-full p-6 sm:p-8 xl:p-12 text-center overflow-y-auto">
      <div className="bg-success/10 p-4 rounded-full mb-6">
        <Trophy size={48} className="text-success" />
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-base-content mb-2">
        复习完成！
      </h2>
      <p className="text-base-content/60 mb-8">
        本轮共复习了 {summaryStats.total} 个生词
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-md mb-8">
        {[
          { label: "忘记", count: summaryStats.forgot, color: "error" },
          { label: "模糊", count: summaryStats.hard, color: "warning" },
          { label: "认识", count: summaryStats.good, color: "success" },
          { label: "简单", count: summaryStats.easy, color: "info" },
        ].map((s) => (
          <div
            key={s.label}
            className={`bg-${s.color}/10 p-3 rounded-xl text-center`}
          >
            <div className={`text-2xl font-bold text-${s.color}`}>
              {s.count}
            </div>
            <div
              className={`text-[10px] font-bold text-${s.color}/60 uppercase`}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Word list */}
      <div className="w-full max-w-md space-y-1.5 mb-8 max-h-48 overflow-y-auto">
        {reviewResults.map((r, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between px-3 py-2 bg-base-200/50 dark:bg-ink-800/50 rounded-lg text-sm"
          >
            <span className="font-medium">{r.word}</span>
            <span
              className={`text-xs font-bold uppercase ${
                r.quality === ReviewQuality.FORGOT
                  ? "text-error"
                  : r.quality === ReviewQuality.HARD
                    ? "text-warning"
                    : r.quality === ReviewQuality.GOOD
                      ? "text-success"
                      : "text-info"
              }`}
            >
              {r.quality === ReviewQuality.FORGOT
                ? "忘记"
                : r.quality === ReviewQuality.HARD
                  ? "模糊"
                  : r.quality === ReviewQuality.GOOD
                    ? "认识"
                    : "简单"}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md shrink-0 mt-2">
        {summaryStats.forgot > 0 && (
          <button
            onClick={handleRetry}
            className="w-full flex-1 flex items-center justify-center gap-2 h-14 py-3.5 px-6 shrink-0 rounded-xl text-base font-bold shadow-lg shadow-primary/20 bg-primary-600 hover:bg-primary-700 text-white transition-all active:scale-[0.98]"
          >
            <RefreshCcw size={18} />
            再来一轮 ({summaryStats.forgot}个)
          </button>
        )}
        <button
          onClick={handleClose}
          className="w-full flex-1 flex items-center justify-center gap-2 h-14 py-3.5 px-6 shrink-0 rounded-xl text-base font-bold bg-base-200 hover:bg-base-300 dark:bg-ink-800 dark:hover:bg-ink-700 text-base-content transition-all active:scale-[0.98]"
        >
          <CheckCircle size={18} />
          完成
        </button>
      </div>
    </div>
  );

  // ==================== SRS Buttons ====================

  const srsButtons = [
    {
      quality: ReviewQuality.FORGOT,
      icon: RotateCcw,
      label: "忘记",
      interval: intervalPreviews.forgot,
      hover: "hover:text-error hover:ring-error/30",
      key: "1",
    },
    {
      quality: ReviewQuality.HARD,
      icon: Clock,
      label: "模糊",
      interval: intervalPreviews.hard,
      hover: "hover:text-warning hover:ring-warning/30",
      key: "2",
    },
    {
      quality: ReviewQuality.GOOD,
      icon: CheckCircle,
      label: "认识",
      interval: intervalPreviews.good,
      hover: "hover:text-success hover:ring-success/30",
      key: "3",
    },
    {
      quality: ReviewQuality.EASY,
      icon: Award,
      label: "简单",
      interval: intervalPreviews.easy,
      hover: "hover:text-info hover:ring-info/30",
      key: "4",
    },
  ];

  // ==================== Main Render ====================

  if (!isReviewOpen || reviewQueue.length === 0 || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 sm:relative z-10 flex flex-col sm:w-full sm:h-[600px] sm:max-h-[90vh] sm:max-w-2xl xl:max-w-3xl bg-base-100 sm:rounded-2xl shadow-none sm:shadow-e3 border-0 sm:border border-base-200 overflow-hidden">
        {/* Header + Progress */}
        <div className="shrink-0 mt-safe xl:mt-0">
          {/* Progress Bar */}
          <div className="h-1 bg-base-200 dark:bg-ink-800">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out rounded-r-full"
              style={{ width: `${showSummary ? 100 : progress}%` }}
            />
          </div>
          <div className="px-4 sm:px-6 py-3 flex justify-between items-center border-b border-base-200 dark:border-ink-800 bg-base-100">
            <div className="flex items-center space-x-2 text-sm font-bold text-base-content/70">
              <BrainCircuit className="w-4 h-4 text-primary" />
              <span>
                {showSummary
                  ? "复习总结"
                  : `${currentReviewIndex + 1} / ${reviewQueue.length}`}
              </span>
              {!showSummary && currentMode && (
                <span className="px-2 py-0.5 bg-base-200 dark:bg-ink-800 text-[10px] rounded-full uppercase tracking-wider text-base-content/50">
                  {MODE_LABELS[currentMode] || "复习"}
                </span>
              )}
            </div>
            <button
              onClick={handleClose}
              className="btn btn-sm btn-circle btn-ghost"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {showSummary ? (
          <div className="flex-1 overflow-y-auto">{renderSummary()}</div>
        ) : (
          <>
            {/* 3D Flip Card Area */}
            <div
              className="flex-1 relative overflow-hidden"
              style={{ perspective: "1200px" }}
            >
              <div
                className="w-full h-full relative"
                style={{
                  transformStyle: "preserve-3d",
                  transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: isCardFlipped
                    ? "rotateY(180deg)"
                    : "rotateY(0deg)",
                }}
              >
                {/* Front Face */}
                <div
                  key={`front-${currentReviewIndex}`}
                  className="absolute inset-0 overflow-y-auto bg-base-100"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                  }}
                >
                  {renderFront()}
                </div>
                {/* Back Face */}
                <div
                  key={`back-${currentReviewIndex}`}
                  className="absolute inset-0 overflow-y-auto bg-base-100"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  {renderBack()}
                </div>
              </div>
            </div>

            {/* SRS Footer */}
            <div className="p-4 xl:p-6 border-t border-base-200 dark:border-ink-800 bg-base-200/50 dark:bg-ink-950/50 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))] xl:pb-6">
              {!isCardFlipped ? (
                <button
                  onClick={() => setIsCardFlipped(true)}
                  className="w-full h-12 btn rounded-xl font-bold shadow-lg shadow-primary/20 bg-primary-600 hover:bg-primary-700 text-white border-primary-600 transition-all active:scale-[0.98]"
                >
                  显示答案
                  <span className="text-xs opacity-60 ml-2 hidden xl:inline">
                    (Space)
                  </span>
                </button>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 xl:gap-3">
                  {srsButtons.map((btn) => (
                    <button
                      key={btn.key}
                      disabled={isSubmitting}
                      onClick={() => handleQualitySelect(btn.quality)}
                      className={`flex flex-col items-center p-2.5 xl:p-3 rounded-xl bg-white dark:bg-ink-800 text-base-content/70 ring-1 ring-base-200 dark:ring-base-content/10 transition-all group disabled:opacity-50 ${btn.hover}`}
                    >
                      <btn.icon
                        size={20}
                        className="mb-1 group-hover:scale-110 transition-transform"
                      />
                      <span className="text-[10px] xl:text-xs font-bold uppercase">
                        {btn.label}
                      </span>
                      <span className="text-[10px] opacity-60">
                        {btn.interval}
                      </span>
                      <span className="text-[9px] opacity-30 hidden xl:block">
                        [{btn.key}]
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
