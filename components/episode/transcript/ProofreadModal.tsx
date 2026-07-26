"use client";

import React, { useState, useEffect } from "react";
import clsx from "clsx";
import {
  XMarkIcon,
  PencilSquareIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { ProcessedSubtitle } from "./types";
import { toast } from "sonner";

interface ProofreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitle: ProcessedSubtitle | null;
  episodeid: string;
  userRole: string; // "ADMIN" | "USER"
}

export function ProofreadModal({
  isOpen,
  onClose,
  subtitle,
  episodeid,
  userRole,
}: ProofreadModalProps) {
  const [editTextEn, setEditTextEn] = useState("");
  const [editTextZh, setEditTextZh] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = userRole === "ADMIN";

  // Sync state when subtitle changes
  useEffect(() => {
    if (subtitle) {
      setEditTextEn(subtitle.textEn);
      setEditTextZh(subtitle.textZh);
    }
  }, [subtitle]);

  const handleSubmit = async () => {
    if (!subtitle) return;

    // Check if any modifications were made
    const enTrimmed = editTextEn.trim();
    const zhTrimmed = editTextZh.trim();
    const originalEnTrimmed = subtitle.textEn.trim();
    const originalZhTrimmed = subtitle.textZh.trim();

    if (enTrimmed === originalEnTrimmed && zhTrimmed === originalZhTrimmed) {
      toast.info("未进行任何更改");
      onClose();
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = isAdmin
        ? "/api/proofread/direct-update"
        : "/api/proofread/submit";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeid,
          subtitleIndex: subtitle.id,
          originalTextEn: subtitle.textEn,
          originalTextZh: subtitle.textZh,
          modifiedTextEn: enTrimmed,
          modifiedTextZh: zhTrimmed,
        }),
      });

      if (res.ok) {
        if (isAdmin) {
          toast.success("字幕已直接更新");
        } else {
          toast.success("校对已提交，等待管理员审核");
        }
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.error || "操作失败");
      }
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!subtitle) return null;

  return (
    <dialog
      className={clsx(
        "modal modal-bottom sm:modal-middle",
        isOpen && "modal-open",
      )}
    >
      <div className="modal-box mb-[100px] md:mb-0 flex flex-col max-h-[80vh] bg-base-100 dark:bg-ink-900 sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl p-0 overflow-hidden border border-base-200 dark:border-ink-800">
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-info-500/10 to-accent-500/10 dark:from-info-900/20 dark:to-accent-900/20 px-6 py-4 flex justify-between items-center border-b border-accent-100 dark:border-info-800/30">
          <h3 className="text-lg font-bold flex items-center gap-2 text-info-700 dark:text-info-400">
            <PencilSquareIcon className="w-5 h-5" /> 校对字幕
          </h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* English */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-base-content/50 dark:text-ink-400 uppercase tracking-wider">
              English
            </label>
            <textarea
              className="textarea textarea-bordered w-full h-28 bg-base-200/30 dark:bg-ink-800/50 dark:border-ink-700 dark:text-ink-200 text-base leading-relaxed focus:bg-white focus:dark:bg-ink-800 transition-colors resize-none font-serif"
              value={editTextEn}
              onChange={(e) => setEditTextEn(e.target.value)}
              placeholder="English subtitle..."
            />
          </div>

          {/* Chinese */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-base-content/50 dark:text-ink-400 uppercase tracking-wider">
              中文翻译
            </label>
            <textarea
              className="textarea textarea-bordered w-full h-24 bg-base-200/30 dark:bg-ink-800/50 dark:border-ink-700 dark:text-ink-200 text-base leading-relaxed focus:bg-white focus:dark:bg-ink-800 transition-colors resize-none"
              value={editTextZh}
              onChange={(e) => setEditTextZh(e.target.value)}
              placeholder="中文翻译..."
            />
          </div>

          {/* Original preview */}
          <div className="bg-ink-50 dark:bg-ink-950/40 p-4 rounded-xl border border-ink-100 dark:border-ink-800/50 max-h-40 overflow-y-auto">
            <p className="text-[10px] font-bold text-ink-400 dark:text-ink-500 uppercase tracking-wider mb-2">
              原始内容参考
            </p>
            <p className="text-sm text-ink-600 dark:text-ink-400 font-serif italic leading-relaxed">
              &ldquo;{subtitle.textEn.trim()}&rdquo;
            </p>
            <p className="text-xs text-ink-400 dark:text-ink-500 mt-1.5 leading-relaxed">
              {subtitle.textZh.trim()}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 bg-base-200/50 dark:bg-ink-950/50 flex justify-end gap-3 border-t border-base-200 dark:border-ink-800">
          <button className="btn btn-ghost rounded-xl" onClick={onClose}>
            取消
          </button>
          <button
            className={clsx(
              "btn rounded-xl px-8",
              isAdmin
                ? "bg-info-600 hover:bg-info-700 text-white border-info-600"
                : "btn-primary",
            )}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="loading loading-spinner"></span>
            ) : (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                {isAdmin ? "直接更新" : "提交审核"}
              </>
            )}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
