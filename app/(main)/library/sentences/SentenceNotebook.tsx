"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  X,
  BookOpen,
  LayoutGrid,
  List,
} from "lucide-react";
import { toast } from "sonner";
import type { SavedSentenceItem } from "@/core/sentences/dto";
import { filterLinkedVocabWords } from "@/core/sentences/linked-vocab";
import { deleteSavedSentence } from "@/lib/actions/sentences-actions";
import { useVocabHighlightStore } from "@/store/vocab-highlight-store";
import { QuickTagDrawer } from "@/components/sentence/QuickTagDrawer";
import { SentenceStats } from "./components/SentenceStats";
import { SentenceCard } from "./components/SentenceCard";
import { SentenceCompactList } from "./components/SentenceCompactList";

interface SentenceNotebookProps {
  sentences: SavedSentenceItem[];
  /** 生词本（word + 释义），英文原句中生词高亮联动 */
  vocabWords: { word: string; definition: string | null }[];
}

/**
 * 句子本主看板（复刻自 yuanlu-podcast pages/Sentences.tsx）：
 * 渐变 Banner + 统计行 + 卡片复习入口；搜索/剧集/标签 pills 筛选；
 * 常显英文原句的卡片列表（微播放器 + 折叠译文与笔记）+ 快捷标签抽屉。
 * 数据来自服务端渲染，删除/编辑后本地同步（乐观交互与源项目一致）。
 */
const SentenceNotebook: React.FC<SentenceNotebookProps> = ({
  sentences: initialList,
  vocabWords,
}) => {
  const [sentences, setSentences] = useState<SavedSentenceItem[]>(initialList);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEpisode, setFilterEpisode] = useState("ALL");
  const [filterTag, setFilterTag] = useState("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | string>("ALL");
  // 视图切换：cards = 卡片详情（微播放器 + 操作坞 + 折叠译文），compact = 简洁清单（行式列表）
  const [viewMode, setViewMode] = useState<"cards" | "compact">("cards");
  const [activeQuickEditSentence, setActiveQuickEditSentence] =
    useState<SavedSentenceItem | null>(null);

  // 真实联动词汇：生词本中实际出现在收藏句子里的词（统计与高亮共用同一口径）
  const linkedVocabWords = useMemo(
    () => filterLinkedVocabWords(vocabWords, sentences),
    [vocabWords, sentences],
  );

  // 生词高亮全局镜像（VocabularyHighlighter 读取）——只喂真实出现在句子中的词汇
  const setVocabWords = useVocabHighlightStore((s) => s.setWords);
  useEffect(() => {
    setVocabWords(linkedVocabWords);
  }, [linkedVocabWords, setVocabWords]);

  // Collect all unique tags across sentences
  const allTags = Array.from(
    new Set(sentences.flatMap((s) => s.tags || [])),
  ).filter(Boolean);

  // 筛选候选：来源剧集由收藏数据派生
  const episodeOptions = useMemo(() => {
    const map = new Map<string, string>();
    sentences.forEach((s) => {
      if (!map.has(s.episodeid)) map.set(s.episodeid, s.episodeTitle);
    });
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [sentences]);

  // 与 service 层 getSavedSentences 同一筛选语义（客户端等价实现）
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sentences.filter((s) => {
      if (filterEpisode !== "ALL" && s.episodeid !== filterEpisode)
        return false;
      if (filterTag !== "ALL" && !s.tags.includes(filterTag)) return false;
      if (q) {
        const inEn = s.enText.toLowerCase().includes(q);
        const inZh = (s.zhText ?? "").toLowerCase().includes(q);
        const inNote = (s.note ?? "").toLowerCase().includes(q);
        const inTags = s.tags.some((t) => t.toLowerCase().includes(q));
        if (!inEn && !inZh && !inNote && !inTags) return false;
      }
      return true;
    });
  }, [sentences, searchQuery, filterEpisode, filterTag]);

  const hasActiveFilter =
    !!searchQuery || filterEpisode !== "ALL" || filterTag !== "ALL";

  const resetFilter = () => {
    setSearchQuery("");
    setFilterEpisode("ALL");
    setFilterTag("ALL");
    setActiveTab("ALL");
  };

  const handleDelete = async (item: SavedSentenceItem) => {
    if (window.confirm(`确定要从句子本中移除此句吗？\n"${item.enText}"`)) {
      try {
        const res = await deleteSavedSentence(item.id);
        if (res.success) {
          setSentences((prev) => prev.filter((s) => s.id !== item.id));
          toast.success("已从句子本中移除");
        } else {
          toast.error(res.message || "删除失败");
        }
      } catch {
        toast.error("网络错误");
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 xl:py-8 space-y-6 xl:space-y-8 animate-in fade-in duration-300">
      {/* 页面头部：标题 + 统计卡片 + 复习横幅（排版对齐生词本） */}
      <SentenceStats
        sentenceCount={sentences.length}
        vocabCount={linkedVocabWords.length}
        tagCount={allTags.length}
      />

      {/* Control / Search & Filter Panel */}
      <div className="bg-white dark:bg-ink-900 rounded-3xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.04)] space-y-4">
        {/* Search Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-ink-300 z-10 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索英文原句、中文翻译、笔记或标签..."
              className="input input-bordered w-full pl-11 rounded-2xl bg-gray-100 dark:bg-ink-800/60 focus:bg-white dark:focus:bg-ink-900 text-sm focus:border-indigo-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-ink-300 p-1 z-10"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Episode Selector Filter */}
          <div className="sm:w-64">
            <select
              value={filterEpisode}
              onChange={(e) => setFilterEpisode(e.target.value)}
              className="select select-bordered w-full rounded-2xl bg-gray-100 dark:bg-ink-800/60 text-sm focus:outline-none"
            >
              <option value="ALL">
                全部播客来源 ({episodeOptions.length})
              </option>
              {episodeOptions.map((ep) => (
                <option key={ep.value} value={ep.value}>
                  {ep.label}
                </option>
              ))}
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-ink-800 p-1 rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "cards"
                  ? "bg-white dark:bg-ink-900 text-gray-800 dark:text-ink-100 shadow-sm"
                  : "text-gray-500 dark:text-ink-300 hover:text-gray-700 dark:hover:text-ink-100"
              }`}
              title="卡片详情视图"
            >
              <LayoutGrid size={14} />
              <span>卡片详情</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("compact")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "compact"
                  ? "bg-white dark:bg-ink-900 text-gray-800 dark:text-ink-100 shadow-sm"
                  : "text-gray-500 dark:text-ink-300 hover:text-gray-700 dark:hover:text-ink-100"
              }`}
              title="简洁清单视图"
            >
              <List size={14} />
              <span>简洁清单</span>
            </button>
          </div>
        </div>

        {/* Tag Pills Filter */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 text-xs">
          <span className="text-gray-400 dark:text-ink-400 flex items-center gap-1 shrink-0 font-semibold">
            <Filter size={12} className="text-gray-400 dark:text-ink-400" />
            <span className="hidden sm:inline">标签分类：</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setActiveTab("ALL");
              setFilterTag("ALL");
            }}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
              (filterTag === "ALL" || !filterTag) && activeTab === "ALL"
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-gray-200/80 text-gray-600 dark:bg-ink-800 dark:text-ink-200 hover:bg-gray-200 dark:hover:bg-ink-700"
            }`}
          >
            全部 ({sentences.length})
          </button>
          {allTags.map((tag) => {
            const count = sentences.filter((s) => s.tags?.includes(tag)).length;
            const isSelected = filterTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setActiveTab(tag);
                  setFilterTag(tag);
                }}
              className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                isSelected
                  ? "bg-primary-600 text-white shadow-sm"
                  : "bg-gray-200/80 text-gray-600 dark:bg-ink-800 dark:text-ink-200 hover:bg-gray-200 dark:hover:bg-ink-700"
              }`}
              >
                <span>{tag}</span>
                <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            );
          })}

          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilter}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold ml-auto shrink-0"
            >
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* Sentences List Area */}
      {sentences.length === 0 ? (
        <div className="bg-white dark:bg-ink-900 rounded-3xl p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.04)] space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 flex items-center justify-center mx-auto">
            <BookOpen size={28} />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-base-content">
              句子本暂无匹配内容
            </h3>
            <p className="text-xs text-base-content/60 leading-relaxed">
              在收听播客时打开「沉浸式逐字稿」，点击字幕行右侧的“书签”按钮，即可一键收藏精选原句！
            </p>
          </div>
          <Link
            href="/discover"
            className="btn btn-sm bg-indigo-600 hover:bg-indigo-500 text-white border-none rounded-xl px-5"
          >
            去浏览播客
          </Link>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white dark:bg-ink-900 rounded-3xl p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.04)] space-y-2">
          <p className="text-base font-bold text-base-content">
            未找到匹配的句子
          </p>
          <p className="text-xs text-base-content/60">
            调整搜索词或筛选条件试试
          </p>
        </div>
      ) : viewMode === "compact" ? (
        /* 简洁清单模式：单容器整行式列表（序号 + 三行文本 + 微播放器 + 图标操作） */
        <SentenceCompactList
          sentences={filteredList}
          onEdit={setActiveQuickEditSentence}
          onDelete={handleDelete}
        />
      ) : (
        <div className="space-y-4">
          {filteredList.map((item) => (
            <SentenceCard
              key={item.id}
              sentence={item}
              isExpanded={expandedId === item.id}
              onToggleExpand={() =>
                setExpandedId(expandedId === item.id ? null : item.id)
              }
              onEdit={setActiveQuickEditSentence}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Quick Tag & Note Modal / Drawer */}
      <QuickTagDrawer
        sentence={activeQuickEditSentence}
        onClose={() => setActiveQuickEditSentence(null)}
        onUpdated={(updated) => {
          setSentences((prev) =>
            prev.map((s) =>
              s.id === updated.id
                ? { ...s, tags: updated.tags, note: updated.note }
                : s,
            ),
          );
        }}
      />
    </div>
  );
};

export default SentenceNotebook;
