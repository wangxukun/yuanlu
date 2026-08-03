/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import {
  regenerateWordAction,
  updateDictionaryAction,
} from "@/lib/actions/admin/dictionary.actions";
import { useRouter } from "next/navigation";

export default function RegenerateConfirmModal({
  word,
  currentData,
  onClose,
}: {
  word: string;
  currentData: any;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [newData, setNewData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    modalRef.current?.showModal();

    const fetchNewData = async () => {
      setLoading(true);
      setError(null);
      const res = await regenerateWordAction(word);
      if (res.success) {
        setNewData(res.data);
      } else {
        setError(res.error || "生成失败");
      }
      setLoading(false);
    };

    fetchNewData();
  }, [word]);

  const handleClose = () => {
    modalRef.current?.close();
    onClose();
  };

  const handleConfirm = async () => {
    if (!newData) return;
    setIsUpdating(true);
    const res = await updateDictionaryAction(word, newData);
    setIsUpdating(false);

    if (res.success) {
      toast.success("更新成功");
      router.refresh();
      handleClose();
    } else {
      toast.error(res.error || "更新失败");
    }
  };

  return (
    <dialog
      ref={modalRef}
      className="modal modal-bottom sm:modal-middle"
      onClose={onClose}
    >
      <div className="modal-box w-11/12 max-w-5xl max-h-[90vh] flex flex-col p-0">
        <div className="flex justify-between items-center p-6 border-b border-base-200">
          <h3 className="font-bold text-xl">重新生成: {word}</h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={handleClose}
            disabled={isUpdating}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-base-content/70">
                正在调用 DeepSeek 生成最新释义...
              </p>
            </div>
          ) : error ? (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-4 h-full">
              <div className="flex-1 border border-base-300 rounded-lg flex flex-col">
                <div className="bg-base-200 p-2 font-bold text-center border-b border-base-300">
                  当前数据
                </div>
                <div className="p-4 overflow-auto flex-1 bg-base-100">
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(currentData, null, 2)}
                  </pre>
                </div>
              </div>
              <div className="flex-1 border border-primary/30 rounded-lg flex flex-col">
                <div className="bg-primary/10 text-primary p-2 font-bold text-center border-b border-primary/20">
                  新生成数据 (待确认)
                </div>
                <div className="p-4 overflow-auto flex-1 bg-base-100">
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(newData, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-base-200 flex justify-end gap-3 bg-base-50">
          <button className="btn" onClick={handleClose} disabled={isUpdating}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={loading || !!error || isUpdating || !newData}
          >
            {isUpdating ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              "确认替换"
            )}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose} disabled={isUpdating}>
          关闭
        </button>
      </form>
    </dialog>
  );
}
