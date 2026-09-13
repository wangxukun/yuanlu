"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Tag,
  FileText,
  Check,
  Plus,
  BookmarkCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { SavedSentenceItem } from "@/core/sentences/dto";
import { updateSentenceMeta } from "@/lib/actions/sentences-actions";

/** 快捷标签预设（复刻自 yuanlu-podcast QuickTagDrawer，共 7 个） */
export const PRESET_SENTENCE_TAGS = [
  "地道表达",
  "长难句",
  "写作素材",
  "商务职场",
  "面试金句",
  "高频俚语",
  "发音重点",
];

interface QuickTagDrawerProps {
  /** 待编辑的句子（句子本内编辑 / 刚收藏的句子）；null 时抽屉关闭 */
  sentence: SavedSentenceItem | null;
  onClose: () => void;
  /** 保存成功后回传最新 tags/note，同步调用方本地状态 */
  onUpdated: (updated: {
    id: number;
    tags: string[];
    note: string | null;
  }) => void;
}

/**
 * 快捷标签与笔记抽屉（复刻自 yuanlu-podcast components/sentence/QuickTagDrawer）：
 * 移动端底部滑出 / 桌面端居中 modal，7 个预设标签 + 自定义标签 + 学习笔记。
 * 提交走 yuanlu 真实 Server Action（updateSentenceMeta）。
 */
export function QuickTagDrawer({
  sentence,
  onClose,
  onUpdated,
}: QuickTagDrawerProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState<string>("");
  const [customTagInput, setCustomTagInput] = useState<string>("");
  const [isAddingTag, setIsAddingTag] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (sentence) {
      setSelectedTags(sentence.tags?.length ? sentence.tags : ["地道表达"]);
      setNote(sentence.note || "");
      setCustomTagInput("");
      setIsAddingTag(false);
    }
  }, [sentence]);

  if (!sentence) return null;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = customTagInput.trim();
    if (!val) return;
    if (!selectedTags.includes(val)) {
      setSelectedTags([...selectedTags, val]);
    }
    setCustomTagInput("");
    setIsAddingTag(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const finalTags = selectedTags.length > 0 ? selectedTags : ["地道表达"];
      const finalNote = note.trim() || null;
      const res = await updateSentenceMeta({
        id: sentence.id,
        tags: finalTags,
        note: finalNote,
      });
      if (res.success) {
        toast.success("✨ 句子笔记与标签已保存！");
        onUpdated({ id: sentence.id, tags: finalTags, note: finalNote });
        onClose();
      } else {
        toast.error(res.message || "保存失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer / Modal Container */}
      <div className="relative w-full sm:max-w-lg bg-base-100 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-base-200 z-10 animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-base-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BookmarkCheck size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-base-content leading-tight">
                完善句子本收藏
              </h3>
              <p className="text-xs text-base-content/50">
                添加分类标签与学习心得
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm text-base-content/50 hover:text-base-content"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1">
          {/* Sentence Summary Preview */}
          <div className="p-3.5 bg-base-200/60 rounded-2xl border border-base-300/50">
            <p className="text-xs font-serif font-bold text-base-content/90 line-clamp-2 leading-relaxed">
              "{sentence.enText}"
            </p>
            <p className="text-[11px] text-base-content/60 mt-1 line-clamp-1 font-sans">
              {sentence.zhText ?? ""}
            </p>
          </div>

          {/* Tags Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-base-content/80 flex items-center gap-1.5">
              <Tag size={13} className="text-indigo-600 dark:text-indigo-400" />
              选择分类标签
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_SENTENCE_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-xs scale-[1.02]"
                        : "bg-gray-100 dark:bg-ink-800 text-gray-600 dark:text-ink-200 hover:bg-gray-200 dark:hover:bg-ink-700"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}

              {/* Custom tags already added */}
              {selectedTags
                .filter((t) => !PRESET_SENTENCE_TAGS.includes(t))
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-content shadow-xs"
                  >
                    {tag} ✕
                  </button>
                ))}

              {isAddingTag ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCustomTag();
                      if (e.key === "Escape") setIsAddingTag(false);
                    }}
                    placeholder="输入标签名..."
                    maxLength={20}
                    className="input input-xs input-bordered w-24 rounded-full bg-base-100 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomTag()}
                    className="btn btn-xs btn-primary btn-circle border-none"
                  >
                    <Check size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingTag(true)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-base-300 text-base-content/50 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-600 dark:hover:border-primary-400 flex items-center gap-1"
                >
                  <Plus size={12} /> 自定义
                </button>
              )}
            </div>
          </div>

          {/* Personal Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-base-content/80 flex items-center gap-1.5">
              <FileText size={13} className="text-indigo-500" />
              个人学习笔记（语法解析、运用场景、生词搭配等）
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              placeholder="例如：长难句宾语从句倒装结构，写作开头句式..."
              className="textarea textarea-bordered w-full rounded-2xl text-xs resize-none min-h-[80px] focus:border-indigo-500 focus:outline-none bg-base-100"
              rows={3}
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="pt-3 border-t border-base-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm rounded-xl text-xs text-base-content/60"
          >
            稍后完善
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-sm rounded-xl px-5 text-xs font-bold shadow-sm flex items-center gap-1.5 border-none bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}{" "}
            保存修改
          </button>
        </div>
      </div>
    </div>
  );
}
