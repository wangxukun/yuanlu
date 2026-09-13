"use client";

import React from "react";
import Link from "next/link";
import {
  ChevronDown,
  Mic,
  FileText,
  Radio,
  BookOpen,
  Edit2,
  Trash2,
} from "lucide-react";
import type { SavedSentenceItem } from "@/core/sentences/dto";
import VocabularyHighlighter from "@/components/sentence/VocabularyHighlighter";
import SentenceMicroPlayer from "@/components/sentence/SentenceMicroPlayer";

interface SentenceCardProps {
  sentence: SavedSentenceItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  /** 打开快捷标签/笔记编辑抽屉 */
  onEdit: (sentence: SavedSentenceItem) => void;
  /** 删除（父组件负责 window.confirm 与 toast） */
  onDelete: (sentence: SavedSentenceItem) => void;
}

/**
 * 句子卡片（复刻自 yuanlu-podcast pages/Sentences.tsx 的卡片渲染）：
 * 默认常显英文原句（serif + 生词高亮）+ 来源/时间切片/标签 meta pills +
 * 右侧操作坞（影子跟读/编辑/删除）；底栏微播放器 + 「查看中文翻译 & 笔记」折叠。
 */
export function SentenceCard({
  sentence: item,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
}: SentenceCardProps) {
  // 操作坞（影子跟读/编辑/删除）：桌面端渲染于卡片右上角（btn-soft/ghost 形态），
  // 移动端渲染于播放条行居右，统一为无背景裸图标风格（与播放/循环图标一致）
  const renderActionDock = (mobile: boolean) => (
    <>
      {/* Shadowing AI Pronunciation Evaluation Entry：跳独立影子跟读评测页，携带句子 id 精准定位初始卡 */}
      {item.subtitleId != null ? (
        <Link
          href={`/library/sentences/review/practice?id=${item.id}`}
          className={
            mobile
              ? "w-8 h-8 rounded-full flex items-center justify-center text-gray-600 dark:text-ink-300 hover:text-gray-800 dark:hover:text-ink-100 transition-colors active:scale-95"
              : "btn btn-sm btn-soft rounded-xl flex items-center gap-1.5 px-3 transition-all active:scale-95"
          }
          title="进入 AI 影子跟读与发音评测"
        >
          <Mic size={mobile ? 16 : 14} />
          {!mobile && <span className="text-xs font-bold">影子跟读</span>}
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className={
            mobile
              ? "w-8 h-8 rounded-full flex items-center justify-center text-gray-300 dark:text-ink-600 cursor-not-allowed"
              : "btn btn-sm btn-outline border-base-300 text-base-content/40 rounded-xl flex items-center gap-1.5 px-3"
          }
          title="该句缺少字幕定位信息，无法跟读"
        >
          <Mic size={mobile ? 16 : 14} />
          {!mobile && <span className="text-xs font-bold">影子跟读</span>}
        </button>
      )}

      {/* Edit Note/Tag trigger */}
      <button
        type="button"
        onClick={() => onEdit(item)}
        className={
          mobile
            ? "w-8 h-8 rounded-full flex items-center justify-center text-gray-600 dark:text-ink-300 hover:text-gray-800 dark:hover:text-ink-100 transition-colors active:scale-95"
            : "btn btn-ghost btn-circle btn-sm text-base-content/50 hover:text-base-content"
        }
        title="编辑笔记与标签"
      >
        <Edit2 size={mobile ? 16 : 14} />
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(item)}
        className={
          mobile
            ? "w-8 h-8 rounded-full flex items-center justify-center text-gray-600 dark:text-ink-300 hover:text-error-500 dark:hover:text-error-400 transition-colors active:scale-95"
            : "btn btn-ghost btn-circle btn-sm text-base-content/40 hover:text-error-500 dark:hover:text-error-400"
        }
        title="从句子本移除"
      >
        <Trash2 size={mobile ? 16 : 14} />
      </button>
    </>
  );

  return (
    <div className="bg-white dark:bg-ink-900 rounded-2xl border border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.07)] transition-all duration-200 overflow-hidden group">
      {/* Main Card Row (Default tidy state: English sentence & audio playback) */}
      <div className="p-4 sm:p-5 flex flex-col gap-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {/* Main English sentence with Vocabulary Highlights */}
            <div className="space-y-2 flex-1">
              <div className="text-base sm:text-xl font-serif font-bold text-gray-800 dark:text-ink-100 leading-relaxed">
                <VocabularyHighlighter text={item.enText} />
              </div>

              {/* Meta Pills: Episode origin, Time slice, Tags */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-ink-300">
                {item.episodeTitle && (
                  <Link
                    href={`/episode/${item.episodeid}`}
                    className="badge badge-sm badge-ghost hover:badge-primary gap-1 font-medium transition-colors"
                    title="跳转至对应单集"
                  >
                    <Radio size={10} />
                    <span className="truncate max-w-[180px]">
                      {item.episodeTitle}
                    </span>
                  </Link>
                )}

                {/* 分类标签：移动端（<sm）独占一行显示在出处链接下方，sm 起与出处同行排布 */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {item.tags?.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Action Docks（桌面端右上角；移动端隐藏，改由播放条行承载） */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {renderActionDock(false)}
          </div>
        </div>

        {/* Micro Audio Player & Collapse Trigger Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 pt-2 border-t border-gray-100 dark:border-ink-800">
          {/* 播放器行：移动端为 [播放][循环][影子跟读][编辑][删除] 五个裸图标整体居右 */}
          <div className="flex items-center justify-end sm:justify-between gap-1 sm:gap-2 w-full sm:w-auto">
            {/* Embedded Micro Player */}
            <SentenceMicroPlayer
              episodeid={item.episodeid}
              startTime={item.startTime}
              endTime={item.endTime}
            />

            {/* Mobile-only action icons */}
            <div className="flex sm:hidden items-center gap-1 shrink-0">
              {renderActionDock(true)}
            </div>
          </div>

          {/* Accordion Toggle for Chinese & Notes */}
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-ink-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-1 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-ink-800 ml-auto"
          >
            <span>{isExpanded ? "收起译文与笔记" : "查看中文翻译 & 笔记"}</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${
                isExpanded
                  ? "rotate-180 text-indigo-600 dark:text-indigo-400"
                  : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Accordion Body */}
      {isExpanded && (
        <div className="bg-gray-50 dark:bg-ink-800/40 border-t border-gray-100 dark:border-ink-800 px-5 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* Chinese Translation */}
          <div className="space-y-1">
            <div className="text-xs font-bold text-gray-400 dark:text-ink-400 flex items-center gap-1.5">
              <BookOpen size={12} className="text-indigo-500" />
              参考译文
            </div>
            <p className="text-sm text-gray-600 dark:text-ink-300 font-normal leading-relaxed">
              {item.zhText}
            </p>
          </div>

          {/* Personal Notes */}
          <div className="space-y-1">
            <div className="text-xs font-bold text-gray-400 dark:text-ink-400 flex items-center gap-1.5">
              <FileText
                size={12}
                className="text-indigo-600 dark:text-indigo-400"
              />
              个人笔记 & 语法搭配
            </div>
            {item.note ? (
              <div className="p-3 bg-white dark:bg-ink-900 rounded-xl border border-gray-100 dark:border-ink-800 text-xs text-gray-600 dark:text-ink-300 leading-relaxed whitespace-pre-wrap font-sans">
                {item.note}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 py-1"
              >
                + 添加你的第一条学习笔记
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
