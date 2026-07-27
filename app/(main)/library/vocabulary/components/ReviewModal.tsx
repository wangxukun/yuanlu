import {
  BrainCircuit,
  X,
  Volume2,
  ExternalLink,
  RotateCcw,
  Clock,
  CheckCircle,
  Award,
} from "lucide-react";
import { renderContext } from "./ContextRenderer";
import { ReviewQuality } from "@/lib/srs";
import { UseVocabularyNotebookReturn } from "../hooks/useVocabularyNotebook";

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
  } = hookOptions;

  if (!isReviewOpen || reviewQueue.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsReviewOpen(false)}
      />
      {/* Modal Content */}
      <div className="relative z-10 flex flex-col w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-base-100 sm:rounded-xl shadow-e3 border border-base-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-base-200 flex justify-between items-center bg-ink-50 dark:bg-ink-950 shrink-0 mt-safe xl:mt-0">
          <div className="flex items-center space-x-2">
            <BrainCircuit className="text-primary" size={20} />
            <span className="font-bold text-base-content/90">复习中</span>
            <span className="bg-ink-200 dark:bg-ink-800 text-base-content/80 text-xs px-2 py-0.5 rounded-full">
              {currentReviewIndex + 1} / {reviewQueue.length}
            </span>
          </div>
          <button
            onClick={() => setIsReviewOpen(false)}
            className="p-2 hover:bg-ink-200 dark:hover:bg-ink-800 rounded-full text-base-content/40 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Flashcard Body */}
        <div className="flex-1 flex flex-col relative overflow-y-auto">
          {/* 正反面切换区域 */}
          <div
            className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 text-center cursor-pointer hover:bg-ink-100/30 dark:hover:bg-ink-800/20 transition-colors min-h-[300px]"
            onClick={() => !isCardFlipped && setIsCardFlipped(true)}
          >
            {!isCardFlipped ? (
              // 正面: 展示例句（挖空）+ 中文翻译
              <div className="space-y-8 animate-in fade-in duration-300 max-w-lg mx-auto">
                <div className="text-sm font-bold text-base-content/40 uppercase tracking-widest">
                  补全句子
                </div>
                <div className="text-xl md:text-3xl leading-relaxed font-serif text-base-content flex flex-col">
                  {renderContext(
                    reviewQueue[currentReviewIndex].contextSentence,
                    reviewQueue[currentReviewIndex].word,
                    true,
                  )}
                  {reviewQueue[currentReviewIndex].contextSentence && (
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={(e) =>
                          playContextAudio(
                            e,
                            reviewQueue[currentReviewIndex].contextSentence,
                          )
                        }
                        className={`p-2 rounded-full transition-all ${
                          playingText ===
                          reviewQueue[currentReviewIndex].contextSentence
                            ? "text-primary bg-primary/20 animate-pulse"
                            : "text-base-content/40 hover:text-primary bg-ink-100 dark:bg-ink-800"
                        }`}
                        title="朗读例句"
                      >
                        <Volume2 size={20} />
                      </button>
                    </div>
                  )}
                </div>
                {reviewQueue[currentReviewIndex].translation && (
                  <div className="text-sm text-base-content/50">
                    {reviewQueue[currentReviewIndex].translation}
                  </div>
                )}
              </div>
            ) : (
              // 背面: 完整信息
              <div className="space-y-6 w-full max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20 xl:pb-0 relative">
                {/* 查看词典按钮 */}
                {reviewQueue[currentReviewIndex].webUrl && (
                  <div className="flex justify-start">
                    <a
                      href={reviewQueue[currentReviewIndex].webUrl!}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                    >
                      <ExternalLink size={14} />
                      查看词典
                    </a>
                  </div>
                )}
                <div>
                  <h2 className="text-3xl xl:text-4xl font-bold text-primary mb-2 break-words">
                    {reviewQueue[currentReviewIndex].word}
                  </h2>
                  <div className="flex items-center justify-center space-x-2 text-base-content/60">
                    <span>{reviewQueue[currentReviewIndex].definition}</span>
                    {reviewQueue[currentReviewIndex].speakUrl && (
                      <button
                        onClick={(e) =>
                          playAudio(e, reviewQueue[currentReviewIndex].speakUrl)
                        }
                        className="p-1 hover:text-primary bg-ink-100 dark:bg-ink-800 rounded-full"
                      >
                        <Volume2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-primary-50 dark:bg-primary-950/30 p-6 rounded-lg flex flex-col">
                  {renderContext(
                    reviewQueue[currentReviewIndex].contextSentence,
                    reviewQueue[currentReviewIndex].word,
                    false,
                  )}
                  {reviewQueue[currentReviewIndex].contextSentence && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={(e) =>
                          playContextAudio(
                            e,
                            reviewQueue[currentReviewIndex].contextSentence,
                          )
                        }
                        className={`p-1.5 rounded-full transition-all ${
                          playingText ===
                          reviewQueue[currentReviewIndex].contextSentence
                            ? "text-primary-600 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/50 animate-pulse"
                            : "text-primary-400 hover:text-primary-600 dark:text-primary-500 dark:hover:text-primary-300 bg-white/50 dark:bg-ink-900/50"
                        }`}
                        title="朗读例句"
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-sm text-base-content/40">
                  {reviewQueue[currentReviewIndex].translation}
                </div>
              </div>
            )}
          </div>

          {/* 控制栏 Footer */}
          <div className="p-4 xl:p-6 border-t border-base-200 bg-ink-50 dark:bg-ink-950 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))] xl:pb-6">
            {!isCardFlipped ? (
              <button
                onClick={() => setIsCardFlipped(true)}
                className="w-full py-4 bg-primary text-primary-content rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-focus transition-all active:scale-[0.98]"
              >
                显示答案
              </button>
            ) : (
              <div className="grid grid-cols-4 gap-2 xl:gap-3">
                <button
                  disabled={isSubmitting}
                  onClick={() => handleSRS(ReviewQuality.FORGOT)}
                  className="flex flex-col items-center p-2 xl:p-3 rounded-lg bg-white dark:bg-ink-800 text-base-content/80 hover:text-error transition-all group disabled:opacity-50"
                >
                  <RotateCcw
                    size={20}
                    className="mb-1 group-hover:scale-110 transition-transform"
                  />
                  <span className="text-[10px] xl:text-xs font-bold uppercase">
                    忘记
                  </span>
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleSRS(ReviewQuality.HARD)}
                  className="flex flex-col items-center p-2 xl:p-3 rounded-lg bg-white dark:bg-ink-800 text-base-content/80 hover:text-warning transition-all group disabled:opacity-50"
                >
                  <Clock
                    size={20}
                    className="mb-1 group-hover:scale-110 transition-transform"
                  />
                  <span className="text-[10px] xl:text-xs font-bold uppercase">
                    模糊
                  </span>
                  <span className="text-[10px] opacity-60">1天</span>
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleSRS(ReviewQuality.GOOD)}
                  className="flex flex-col items-center p-2 xl:p-3 rounded-lg bg-white dark:bg-ink-800 text-base-content/80 hover:text-success transition-all group disabled:opacity-50"
                >
                  <CheckCircle
                    size={20}
                    className="mb-1 group-hover:scale-110 transition-transform"
                  />
                  <span className="text-[10px] xl:text-xs font-bold uppercase">
                    认识
                  </span>
                  <span className="text-[10px] opacity-60">3天</span>
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleSRS(ReviewQuality.EASY)}
                  className="flex flex-col items-center p-2 xl:p-3 rounded-lg bg-white dark:bg-ink-800 text-base-content/80 hover:text-info transition-all group disabled:opacity-50"
                >
                  <Award
                    size={20}
                    className="mb-1 group-hover:scale-110 transition-transform"
                  />
                  <span className="text-[10px] xl:text-xs font-bold uppercase">
                    简单
                  </span>
                  <span className="text-[10px] opacity-60">7天</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
