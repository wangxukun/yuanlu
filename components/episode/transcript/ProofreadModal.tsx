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
      <div className="modal-box bg-base-100 sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl p-0 overflow-hidden border border-base-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 px-6 py-4 flex justify-between items-center border-b border-purple-100">
          <h3 className="text-lg font-bold flex items-center gap-2 text-violet-700">
            <PencilSquareIcon className="w-5 h-5" /> 校对字幕
          </h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* English */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-base-content/50 uppercase tracking-wider">
              English
            </label>
            <textarea
              className="textarea textarea-bordered w-full h-28 bg-base-200/30 text-base leading-relaxed focus:bg-white transition-colors resize-none font-serif"
              value={editTextEn}
              onChange={(e) => setEditTextEn(e.target.value)}
              placeholder="English subtitle..."
            />
          </div>

          {/* Chinese */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-base-content/50 uppercase tracking-wider">
              中文翻译
            </label>
            <textarea
              className="textarea textarea-bordered w-full h-24 bg-base-200/30 text-base leading-relaxed focus:bg-white transition-colors resize-none"
              value={editTextZh}
              onChange={(e) => setEditTextZh(e.target.value)}
              placeholder="中文翻译..."
            />
          </div>

          {/* Original preview */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              原始内容参考
            </p>
            <p className="text-sm text-slate-600 font-serif italic leading-relaxed">
              &ldquo;{subtitle.textEn.trim()}&rdquo;
            </p>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {subtitle.textZh.trim()}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-base-200/50 flex justify-end gap-3 border-t border-base-200">
          <button className="btn btn-ghost rounded-xl" onClick={onClose}>
            取消
          </button>
          <button
            className={clsx(
              "btn rounded-xl px-8",
              isAdmin
                ? "bg-violet-600 hover:bg-violet-700 text-white border-violet-600"
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
