/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef } from "react";
import { SpeakerWaveIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

export default function DictionaryDetailModal({
  data,
  onClose,
}: {
  data: any;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const dict = data.data || {};

  useEffect(() => {
    modalRef.current?.showModal();
  }, []);

  const handleClose = () => {
    modalRef.current?.close();
    onClose();
  };

  const playAudio = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch((err) => toast.error("播放失败: " + err.message));
  };

  return (
    <dialog
      ref={modalRef}
      className="modal modal-bottom sm:modal-middle"
      onClose={onClose}
    >
      <div className="modal-box w-11/12 max-w-3xl max-h-[90vh] flex flex-col p-0">
        <div className="flex justify-between items-center p-6 border-b border-base-200">
          <h3 className="font-bold text-2xl flex items-end gap-3">
            {data.word}
            {dict.phonetics && (
              <span className="text-sm font-normal text-base-content/60 pb-1">
                {dict.phonetics.us && `US: /${dict.phonetics.us}/ `}
                {dict.phonetics.uk && `UK: /${dict.phonetics.uk}/`}
              </span>
            )}
          </h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={handleClose}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Audio */}
          {dict.audio_urls && (
            <div className="flex gap-4">
              {dict.audio_urls.us && (
                <button
                  className="btn btn-sm btn-outline btn-secondary"
                  onClick={() => playAudio(dict.audio_urls.us)}
                >
                  <SpeakerWaveIcon className="w-4 h-4 mr-2" />
                  美音发音
                </button>
              )}
              {dict.audio_urls.uk && (
                <button
                  className="btn btn-sm btn-outline btn-accent"
                  onClick={() => playAudio(dict.audio_urls.uk)}
                >
                  <SpeakerWaveIcon className="w-4 h-4 mr-2" />
                  英音发音
                </button>
              )}
            </div>
          )}

          {/* Definitions */}
          {dict.definitions && dict.definitions.length > 0 && (
            <div>
              <h4 className="font-semibold text-lg mb-2">释义</h4>
              <ul className="space-y-3">
                {dict.definitions.map((def: any, i: number) => (
                  <li key={i} className="bg-base-200/50 p-3 rounded-lg">
                    <div className="font-bold text-primary mb-1">
                      {def.pos} {def.meaning_cn}
                      {def.cefr_level && (
                        <span className="badge badge-sm badge-info ml-2">
                          {def.cefr_level}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-base-content/80">
                      {def.meaning_en}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Examples */}
          {dict.examples && dict.examples.length > 0 && (
            <div>
              <h4 className="font-semibold text-lg mb-2">例句</h4>
              <ul className="space-y-2">
                {dict.examples.map((ex: any, i: number) => (
                  <li key={i} className="list-disc list-inside">
                    <span className="text-base-content font-medium">
                      {ex.en}
                    </span>
                    <p className="text-sm text-base-content/70 ml-5">{ex.cn}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Etymology */}
          {dict.etymology && (
            <div>
              <h4 className="font-semibold text-lg mb-2">词源与助记</h4>
              <div className="bg-base-200/50 p-4 rounded-lg text-sm space-y-2">
                {dict.etymology.breakdown && (
                  <p>
                    <strong>拆解:</strong> {dict.etymology.breakdown}
                  </p>
                )}
                {dict.etymology.mnemonic && (
                  <p>
                    <strong>助记:</strong> {dict.etymology.mnemonic}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Raw JSON */}
          <div className="collapse collapse-arrow bg-base-200">
            <input type="checkbox" />
            <div className="collapse-title font-medium">查看原始 JSON 数据</div>
            <div className="collapse-content">
              <pre className="bg-base-300 p-4 rounded-lg overflow-x-auto text-xs">
                {JSON.stringify(dict, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>关闭</button>
      </form>
    </dialog>
  );
}
