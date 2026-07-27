import React from "react";
import clsx from "clsx";
import {
  BookOpenIcon,
  XMarkIcon,
  SpeakerWaveIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface VocabularyModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (val: boolean) => void;
  selectedWord: string;
  selectedContext: string;
  selectedTranslation: string;
  definition: string;
  setDefinition: (val: string) => void;
  isLoadingDefinition: boolean;
  wordDetails: {
    speakUrl?: string;
    dictUrl?: string;
    webUrl?: string;
    mobileUrl?: string;
  };
  isSaving: boolean;
  onSave: () => void;
  onPlayAudio: () => void;
}

export function VocabularyModal({
  isModalOpen,
  setIsModalOpen,
  selectedWord,
  selectedContext,
  selectedTranslation,
  definition,
  setDefinition,
  isLoadingDefinition,
  wordDetails,
  isSaving,
  onSave,
  onPlayAudio,
}: VocabularyModalProps) {
  return (
    <dialog
      className={clsx(
        "modal modal-bottom sm:modal-middle",
        isModalOpen && "modal-open",
      )}
    >
      <div className="modal-box mb-[100px] md:mb-0 flex flex-col max-h-[80vh] bg-base-100 sm:max-w-xl rounded-t-xl sm:rounded-xl shadow-e3 p-0 overflow-hidden border border-base-200">
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-primary-500/10 to-accent-500/10 dark:from-primary-900/20 dark:to-accent-900/20 px-6 py-4 flex justify-between items-center border-b border-accent-100 dark:border-primary-800/30">
          <h3 className="text-lg font-bold flex items-center gap-2 text-primary-700 dark:text-primary-400">
            <BookOpenIcon className="w-5 h-5" /> 查词助手
          </h3>
          <button
            onClick={() => setIsModalOpen(false)}
            className="btn btn-sm btn-circle btn-ghost"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl font-serif font-black text-ink-800 dark:text-ink-100 break-all">
                {selectedWord}
              </h2>
              {wordDetails.speakUrl && (
                <button
                  onClick={onPlayAudio}
                  className="btn btn-circle btn-sm btn-primary btn-outline flex-shrink-0"
                >
                  <SpeakerWaveIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-base-content/50 dark:text-ink-400 uppercase tracking-wider">
                定义
              </label>
              {isLoadingDefinition && (
                <span className="loading loading-spinner loading-xs text-primary"></span>
              )}
            </div>
            <textarea
              className="textarea textarea-bordered w-full h-24 bg-base-200/30 dark:bg-ink-800/50 dark:border-ink-700 dark:text-ink-200 text-base leading-relaxed focus:bg-white focus:dark:bg-ink-800 transition-colors resize-none"
              placeholder="输入释义..."
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
            ></textarea>

            <div className="flex flex-wrap gap-2 pt-1">
              {wordDetails.webUrl && (
                <a
                  href={wordDetails.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 btn btn-xs btn-outline btn-accent"
                >
                  <span>查看详情</span>
                </a>
              )}
            </div>
          </div>

          <div className="bg-ink-50 dark:bg-ink-950/40 p-4 rounded-xl border border-ink-100 dark:border-ink-800/50 max-h-40 overflow-y-auto">
            <p className="text-[10px] font-bold text-ink-400 dark:text-ink-500 uppercase tracking-wider mb-2">
              上下文参考
            </p>
            <p className="text-sm text-ink-600 dark:text-ink-400 font-serif italic leading-relaxed mb-1.5">
              &ldquo;{selectedContext}&rdquo;
            </p>
            <p className="text-xs text-ink-400 dark:text-ink-500 leading-relaxed">
              {selectedTranslation}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 bg-base-200/50 dark:bg-ink-950/50 flex justify-end gap-3 border-t border-base-200 dark:border-ink-800">
          <button
            className="btn btn-ghost rounded-xl"
            onClick={() => setIsModalOpen(false)}
          >
            取消
          </button>
          <button
            className="btn rounded-xl px-8 bg-primary-600 hover:bg-primary-700 text-white border-primary-600"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <span className="loading loading-spinner"></span>
            ) : (
              <>
                <CheckCircleIcon className="w-5 h-5" /> 保存生词
              </>
            )}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={() => setIsModalOpen(false)}>close</button>
      </form>
    </dialog>
  );
}
