import React, { useEffect, useState } from "react";
import clsx from "clsx";
import {
  BookmarkIcon,
  XMarkIcon,
  SpeakerWaveIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import type { DictEntryDTO } from "@/core/dictionary/dto";

interface VocabularyModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (val: boolean) => void;
  selectedWord: string;
  dictData: DictEntryDTO | null;
  isLoadingDefinition: boolean;
  isSaving: boolean;
  isSaved?: boolean;
  episodeTitle?: string;
  onSave: () => void;
  onComplete?: () => void;
}

export function VocabularyModal({
  isModalOpen,
  setIsModalOpen,
  selectedWord,
  dictData,
  isLoadingDefinition,
  isSaving,
  isSaved = false,
  episodeTitle,
  onSave,
  onComplete,
}: VocabularyModalProps) {
  // 词源记忆模块默认收缩，点击头部展开；查询新词时自动重置
  const [isEtymologyOpen, setIsEtymologyOpen] = useState(false);
  useEffect(() => {
    setIsEtymologyOpen(false);
  }, [selectedWord]);

  const playAudio = (url?: string) => {
    if (url) {
      new Audio(url).play().catch(console.error);
    }
  };

  const content = (
    <>
      {/* ── Body ── */}
      <div className="p-6 space-y-4 flex-1 overflow-y-auto">
        {/* Word title row */}
        <div className="flex items-start justify-between">
          <h2 className="text-3xl font-bold text-primary-600 dark:text-primary-400 break-all leading-tight">
            {selectedWord}
          </h2>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              onClick={onSave}
              disabled={isSaving || isSaved}
              className={clsx(
                "btn btn-sm btn-ghost btn-square",
                isSaved && "text-primary cursor-default hover:bg-transparent",
              )}
              title={isSaved ? "已在生词本中" : "保存生词"}
            >
              {isSaving ? (
                <span className="loading loading-spinner loading-xs" />
              ) : isSaved ? (
                <BookmarkIcon className="w-5 h-5 fill-current" />
              ) : (
                <BookmarkIcon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setIsModalOpen(false)}
              className="btn btn-sm btn-ghost btn-square"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Phonetics + audio */}
        {isLoadingDefinition ? (
          <div className="flex items-center gap-2 py-4">
            <span className="loading loading-spinner loading-md text-primary" />
            <span className="text-sm text-base-content/60">
              请耐心等待，正在查询词典…
            </span>
          </div>
        ) : dictData ? (
          <>
            {/* Phonetics row */}
            <div className="flex items-center gap-3 text-sm text-base-content/60">
              {dictData.phonetics?.uk && (
                <span className="font-mono">{dictData.phonetics.uk}</span>
              )}
              {dictData.audio_urls?.uk && (
                <button
                  onClick={() => playAudio(dictData.audio_urls.uk)}
                  className="btn btn-xs btn-circle btn-ghost"
                  title="播放发音 (UK)"
                >
                  <SpeakerWaveIcon className="w-3.5 h-3.5" />
                </button>
              )}
              {dictData.phonetics?.us &&
                dictData.phonetics.us !== dictData.phonetics.uk && (
                  <>
                    <span className="text-base-content/30">|</span>
                    <span className="font-mono">{dictData.phonetics.us}</span>
                    {dictData.audio_urls?.us && (
                      <button
                        onClick={() => playAudio(dictData.audio_urls.us)}
                        className="btn btn-xs btn-circle btn-ghost"
                        title="播放发音 (US)"
                      >
                        <SpeakerWaveIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
            </div>

            {/* Definitions card */}
            {dictData.definitions?.length > 0 && (
              <div className="bg-base-200/30 dark:bg-ink-800/40 p-4 rounded-xl border border-base-200/60 dark:border-ink-700/40">
                <p className="text-[10px] font-bold text-base-content/40 uppercase tracking-wider mb-2.5">
                  词性与释义
                </p>
                <div className="space-y-2">
                  {dictData.definitions.map((def, i) => (
                    <div key={i} className="text-sm leading-relaxed">
                      <div className="flex gap-2">
                        <span className="font-bold text-primary-600 dark:text-primary-400 shrink-0">
                          [{def.pos}]
                        </span>
                        <span className="text-base-content/90 dark:text-ink-100">
                          {def.meaning_cn}
                        </span>
                      </div>
                      {def.meaning_en && (
                        <p className="ml-[calc(0.5rem+2ch+0.5rem)] text-xs text-base-content/50 dark:text-ink-400 mt-0.5">
                          {def.meaning_en}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Etymology memory card（默认收缩，点击展开：词素拆解 + 词源故事 + 记忆技巧） */}
            {(() => {
              const ety = dictData.etymology;
              if (
                !ety ||
                (!ety.breakdown &&
                  !ety.mnemonic &&
                  !ety.prefix &&
                  !ety.root &&
                  !ety.suffix)
              ) {
                return null;
              }
              // 收缩态预览：优先展示词根，无词根取任一可用词素
              const collapsedPreview =
                ety.root || ety.prefix || ety.suffix || null;

              return (
                <div className="bg-primary-50/80 dark:bg-primary-950/20 rounded-xl border border-primary-100/60 dark:border-primary-800/30 overflow-hidden">
                  <button
                    onClick={() => setIsEtymologyOpen((v) => !v)}
                    aria-expanded={isEtymologyOpen}
                    className="w-full flex items-center justify-between gap-2 p-4 pb-2.5 text-left hover:bg-primary-100/40 dark:hover:bg-primary-900/20 transition-colors"
                  >
                    <p className="text-[10px] font-bold text-primary-500/60 dark:text-primary-400/60 uppercase tracking-wider flex items-center gap-1">
                      <span>🧬</span> 词源记忆
                    </p>
                    <span className="flex items-center gap-2 min-w-0">
                      {!isEtymologyOpen && collapsedPreview && (
                        <span className="text-[10px] text-primary-500/70 dark:text-primary-400/70 font-bold truncate max-w-[150px]">
                          {collapsedPreview}
                        </span>
                      )}
                      <ChevronDownIcon
                        className={clsx(
                          "w-4 h-4 text-primary-500/70 shrink-0 transition-transform duration-200",
                          isEtymologyOpen && "rotate-180",
                        )}
                      />
                    </span>
                  </button>

                  {isEtymologyOpen && (
                    <div className="px-4 pb-4">
                      {(ety.prefix || ety.root || ety.suffix) && (
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          {ety.prefix && (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                              前缀 · {ety.prefix}
                            </span>
                          )}
                          {ety.root && (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                              词根 · {ety.root}
                            </span>
                          )}
                          {ety.suffix && (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-base-200 text-base-content/70 dark:bg-ink-800 dark:text-ink-300">
                              后缀 · {ety.suffix}
                            </span>
                          )}
                        </div>
                      )}

                      {ety.breakdown && (
                        <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed mb-2">
                          {ety.breakdown}
                        </p>
                      )}

                      {ety.mnemonic && (
                        <div className="bg-white/70 dark:bg-ink-900/40 rounded-lg p-2.5 border border-primary-100/50 dark:border-primary-800/20">
                          <p className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed">
                            <span className="font-bold text-primary-600 dark:text-primary-400">
                              💡 记忆技巧：
                            </span>
                            {ety.mnemonic}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        ) : (
          /* Error / no data state */
          <div className="py-4 text-center text-sm text-base-content/50">
            暂无词典数据
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 px-6 py-3 flex items-center justify-between border-t border-base-200 dark:border-ink-800">
        <span className="text-xs text-base-content/40 truncate max-w-[60%]">
          {episodeTitle && <>来源：{episodeTitle}</>}
        </span>
        <button
          onClick={() => {
            onComplete?.();
            setIsModalOpen(false);
          }}
          className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
        >
          完成学习 →
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Modal for Mobile and Desktop */}
      <dialog
        className={clsx(
          "modal modal-bottom sm:modal-middle md:landscape:hidden xl:flex",
          isModalOpen && "modal-open",
        )}
      >
        <div className="modal-box w-full max-w-none h-[100dvh] max-h-[100dvh] rounded-none flex flex-col bg-base-100 sm:h-auto sm:max-h-[80vh] sm:max-w-xl sm:rounded-xl shadow-e3 p-0 overflow-hidden border-none sm:border sm:border-base-200">
          {content}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setIsModalOpen(false)}>close</button>
        </form>
      </dialog>

      {/* Floating Card for Tablet Landscape */}
      <div
        className={clsx(
          "hidden md:landscape:flex xl:hidden fixed bottom-6 right-6 w-[400px] max-h-[60vh] bg-base-100 rounded-xl shadow-2xl border border-base-200 z-[300] flex-col overflow-hidden transition-all duration-300",
          isModalOpen
            ? "translate-y-0 opacity-100"
            : "translate-y-10 opacity-0 pointer-events-none",
        )}
      >
        {content}
      </div>
    </>
  );
}
