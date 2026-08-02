import React from "react";
import clsx from "clsx";
import {
  BookmarkIcon,
  XMarkIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";
import type { DictEntryDTO } from "@/core/dictionary/dto";

interface VocabularyModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (val: boolean) => void;
  selectedWord: string;
  selectedContext: string;
  selectedTranslation: string;
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
  selectedContext,
  selectedTranslation,
  dictData,
  isLoadingDefinition,
  isSaving,
  isSaved = false,
  episodeTitle,
  onSave,
  onComplete,
}: VocabularyModalProps) {
  const playAudio = (url?: string) => {
    if (url) {
      new Audio(url).play().catch(console.error);
    }
  };

  return (
    <dialog
      className={clsx(
        "modal modal-bottom sm:modal-middle",
        isModalOpen && "modal-open",
      )}
    >
      <div className="modal-box mb-[100px] md:mb-0 flex flex-col max-h-[80vh] bg-base-100 sm:max-w-xl rounded-t-xl sm:rounded-xl shadow-e3 p-0 overflow-hidden border border-base-200">
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
                正在查询词典…
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

              {/* Context example card */}
              <div className="bg-primary-50/80 dark:bg-primary-950/20 p-4 rounded-xl border border-primary-100/60 dark:border-primary-800/30">
                <p className="text-[10px] font-bold text-primary-500/60 dark:text-primary-400/60 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span>📖</span> 本句出处例句
                </p>
                <p className="text-sm text-ink-700 dark:text-ink-300 font-serif italic leading-relaxed mb-1.5">
                  &ldquo;{selectedContext}&rdquo;
                </p>
                {selectedTranslation && (
                  <p className="text-xs text-ink-400 dark:text-ink-500 leading-relaxed">
                    {selectedTranslation}
                  </p>
                )}
              </div>

              {/* AI deep analysis button (placeholder) */}
              <button
                onClick={() =>
                  toast("即将推出", {
                    description:
                      "AI 语境用法深度剖析功能正在开发中，敬请期待！",
                  })
                }
                className="btn w-full rounded-xl bg-primary-600 hover:bg-primary-700 text-white border-primary-600 gap-2"
              >
                <SparklesIcon className="w-5 h-5" />
                生成 AI 语境用法深度剖析
              </button>
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
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={() => setIsModalOpen(false)}>close</button>
      </form>
    </dialog>
  );
}
