"use client";

import React from "react";
import Link from "next/link";
import { Mic, Edit2, Trash2, FileText, Radio } from "lucide-react";
import type { SavedSentenceItem } from "@/core/sentences/dto";
import VocabularyHighlighter from "@/components/sentence/VocabularyHighlighter";
import SentenceMicroPlayer from "@/components/sentence/SentenceMicroPlayer";
import { useNotebookBase } from "@/lib/notebook-base";

interface SentenceCompactListProps {
  sentences: SavedSentenceItem[];
  /** 打开快捷标签/笔记编辑抽屉 */
  onEdit: (sentence: SavedSentenceItem) => void;
  /** 删除（父组件负责 window.confirm 与 toast） */
  onDelete: (sentence: SavedSentenceItem) => void;
}

/**
 * 简洁清单模式（复刻自 yuanlu-podcast pages/Sentences.tsx 的 Compact List View）：
 * 单一容器 + 1px 分隔线；每行 = 序号 + 文本三行堆叠（衬线英文 / 中文 / 元数据行）
 * + 微播放器与图标操作坞（移动端纵向堆叠右下对齐，md 起整行垂直居中）。
 * 字号/间距/图标尺寸与源项目逐类对齐：英文 text-sm sm:text-base semibold、
 * 中文 text-xs、行 p-3.5 sm:px-5 sm:py-4、Mic 15 / Edit2 14 / Trash2 14 / Radio 10。
 */
export function SentenceCompactList({
  sentences,
  onEdit,
  onDelete,
}: SentenceCompactListProps) {
  // 影子跟读入口用绝对路径前缀（相对路径在 Segment Cache Link 下解析基准是 layout 段，会 404）
  const base = useNotebookBase("sentences");

  return (
    <div className="bg-white dark:bg-ink-900 rounded-2xl border border-gray-200 dark:border-ink-800 overflow-hidden shadow-sm divide-y divide-gray-200 dark:divide-ink-800">
      {sentences.map((item, index) => (
        <div
          key={item.id}
          className="p-3.5 sm:px-5 sm:py-4 hover:bg-gray-100/60 dark:hover:bg-ink-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 group"
        >
          {/* Left side: index + text & translation */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-xs font-mono font-bold text-gray-400 dark:text-ink-500 pt-0.5 w-6 shrink-0 text-right">
              {index + 1}.
            </span>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="text-sm sm:text-base font-serif font-semibold text-gray-800 dark:text-ink-100 leading-snug">
                <VocabularyHighlighter text={item.enText} />
              </div>
              <div className="text-xs text-gray-500 dark:text-ink-300 font-medium leading-relaxed">
                {item.zhText}
              </div>

              {/* Compact metadata row */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-gray-500 dark:text-ink-400">
                {item.episodeTitle && (
                  <Link
                    href={`/episode/${item.episodeid}`}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate max-w-[160px] flex items-center gap-1"
                    title={item.episodeTitle}
                  >
                    <Radio size={10} />
                    {item.episodeTitle}
                  </Link>
                )}
                <span className="hidden md:inline-block font-mono text-[10px] bg-gray-100 dark:bg-ink-800 px-1.5 py-0.5 rounded">
                  {item.startTime}s - {item.endTime}s
                </span>
                {item.tags?.map((t) => (
                  <span
                    key={t}
                    className="hidden md:inline-block text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[10px] font-medium"
                  >
                    #{t}
                  </span>
                ))}
                {item.note && (
                  <span
                    className="hidden md:flex items-center gap-1 text-indigo-600/80 dark:text-indigo-400/80 text-[11px] bg-indigo-500/5 px-2 py-0.5 rounded-md"
                    title={item.note}
                  >
                    <FileText size={11} />
                    <span className="truncate max-w-[200px]">{item.note}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side: audio player & actions（移动端裸图标右对齐，与卡片视图同风格） */}
          <div className="flex items-center justify-end gap-1 md:gap-2 shrink-0 self-end md:self-center pl-9 md:pl-0">
            <SentenceMicroPlayer
              episodeid={item.episodeid}
              startTime={item.startTime}
              endTime={item.endTime}
            />
            {item.subtitleId != null ? (
              <Link
                href={`${base}/review/practice?id=${item.id}`}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 dark:text-ink-300 hover:text-gray-800 dark:hover:text-ink-100 transition-colors active:scale-95 md:text-indigo-600 md:dark:text-indigo-400 md:hover:bg-indigo-500/10"
                title="AI 影子跟读"
              >
                <Mic size={16} />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 dark:text-ink-600 cursor-not-allowed"
                title="该句缺少字幕定位信息，无法跟读"
              >
                <Mic size={16} />
              </button>
            )}
            {/* 编辑/删除：移动端隐藏，md 起显示 */}
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="btn btn-ghost btn-circle btn-sm text-gray-500 dark:text-ink-300 hover:text-gray-800 dark:hover:text-ink-100"
                title="编辑笔记与标签"
              >
                <Edit2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="btn btn-ghost btn-circle btn-sm text-gray-400 dark:text-ink-400 hover:text-error-500 dark:hover:text-error-400"
                title="从句子本移除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
