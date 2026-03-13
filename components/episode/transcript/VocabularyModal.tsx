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
      <div className="modal-box bg-base-100 sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-0 overflow-hidden border border-base-200">
        <div className="bg-primary/5 px-6 py-4 flex justify-between items-center border-b border-primary/10">
          <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
            <BookOpenIcon className="w-5 h-5" /> 查词助手
          </h3>
          <button
            onClick={() => setIsModalOpen(false)}
            className="btn btn-sm btn-circle btn-ghost"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl font-serif font-black text-slate-800 break-all">
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
              <label className="text-xs font-bold text-base-content/40 uppercase tracking-wider">
                定义
              </label>
              {isLoadingDefinition && (
                <span className="loading loading-spinner loading-xs text-primary"></span>
              )}
            </div>
            <textarea
              className="textarea textarea-bordered w-full h-24 bg-base-200/30 text-base leading-relaxed focus:bg-white transition-colors resize-none"
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

          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
            <p className="text-sm text-slate-700 font-serif italic mb-2">
              “{selectedContext}”
            </p>
            <p className="text-xs text-slate-500">{selectedTranslation}</p>
          </div>
        </div>

        <div className="p-4 bg-base-200/50 flex justify-end gap-3 border-t border-base-200 safe-pb-4">
          <button
            className="btn btn-ghost rounded-xl"
            onClick={() => setIsModalOpen(false)}
          >
            取消
          </button>
          <button
            className="btn btn-primary rounded-xl px-8"
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
