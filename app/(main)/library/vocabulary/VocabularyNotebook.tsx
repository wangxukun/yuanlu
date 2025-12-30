"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Volume2,
  Clock,
  BrainCircuit,
  Filter,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
  CheckCircle,
  Award,
  BookOpen,
  BookOpenCheck,
} from "lucide-react";
import { submitReviewAction } from "@/lib/actions/vocabulary-actions";
import { ReviewQuality } from "@/lib/srs";
import { toast } from "sonner";

// 定义前端使用的类型，匹配 Service 返回的数据结构
export interface VocabularyItem {
  vocabularyid: number;
  word: string;
  definition: string | null;
  translation: string | null;
  contextSentence: string | null;
  proficiency: number;
  nextReviewAt: string | null;
  addedDate: string | null;
  speakUrl: string | null;
  webUrl: string | null;
  timestamp: number | null;
  episodeTitle?: string;
}

interface VocabularyNotebookProps {
  vocabularyList: VocabularyItem[];
}

// 辅助函数：格式化日期
const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
};

// 辅助函数：检查是否需要复习 (日期 <= 现在)
const isDue = (dateStr?: string | null) => {
  if (!dateStr) return true; // 如果没有日期，默认需要复习
  return new Date(dateStr) <= new Date();
};

const VocabularyNotebook: React.FC<VocabularyNotebookProps> = ({
  vocabularyList: initialList,
}) => {
  // 状态管理
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>(initialList);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMethod, setSortMethod] = useState<"review" | "added" | "alpha">(
    "review",
  );
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 复习模式状态
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<VocabularyItem[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 统计数据
  const stats = useMemo(
    () => ({
      total: vocabulary.length,
      due: vocabulary.filter((v) => isDue(v.nextReviewAt)).length,
      mastered: vocabulary.filter((v) => v.proficiency >= 5).length,
    }),
    [vocabulary],
  );

  // 过滤和排序列表
  const filteredList = useMemo(() => {
    const list = vocabulary.filter(
      (v) =>
        v.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.translation?.includes(searchQuery),
    );

    switch (sortMethod) {
      case "review":
        // 优先显示需要复习的（时间早的在前）
        list.sort(
          (a, b) =>
            new Date(a.nextReviewAt || 0).getTime() -
            new Date(b.nextReviewAt || 0).getTime(),
        );
        break;
      case "added":
        // 优先显示新添加的
        list.sort(
          (a, b) =>
            new Date(b.addedDate || 0).getTime() -
            new Date(a.addedDate || 0).getTime(),
        );
        break;
      case "alpha":
        list.sort((a, b) => a.word.localeCompare(b.word));
        break;
    }
    return list;
  }, [vocabulary, searchQuery, sortMethod]);

  // 播放音频
  const playAudio = (e: React.MouseEvent, url?: string | null) => {
    e.stopPropagation();
    if (!url) {
      toast.error("暂无发音");
      return;
    }
    try {
      const audio = new Audio(url);
      audio.onerror = (err) => {
        console.error("Audio playback error:", err);
        toast.error("播放失败：音频源无效或格式不支持");
      };
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("Play promise rejected:", error);
          toast.error("播放失败，请检查音频链接");
        });
      }
    } catch (error) {
      console.error("Audio initialization error:", error);
      toast.error("音频初始化失败");
    }
  };

  // --- 复习模式逻辑 ---
  const startReview = () => {
    const dueWords = vocabulary.filter((v) => isDue(v.nextReviewAt));
    if (dueWords.length === 0) return;
    setReviewQueue(dueWords);
    setCurrentReviewIndex(0);
    setIsCardFlipped(false);
    setIsReviewOpen(true);
  };

  const handleSRS = async (quality: number) => {
    if (isSubmitting) return;
    const currentWord = reviewQueue[currentReviewIndex];
    if (!currentWord) return;

    setIsSubmitting(true);
    const res = await submitReviewAction(currentWord.vocabularyid, quality);

    if (res.success && res.data) {
      const updatedData = res.data;
      setVocabulary((prev) =>
        prev.map((v) =>
          v.vocabularyid === updatedData.vocabularyid
            ? {
                ...v,
                proficiency: updatedData.proficiency,
                nextReviewAt: updatedData.nextReviewAt,
              }
            : v,
        ),
      );
    } else {
      toast.error("网络错误，保存进度失败");
    }

    setIsSubmitting(false);
    if (currentReviewIndex < reviewQueue.length - 1) {
      setIsCardFlipped(false);
      setCurrentReviewIndex((prev) => prev + 1);
    } else {
      setIsReviewOpen(false);
      toast.success("恭喜！今日复习任务已完成 🎉");
    }
  };

  // --- 渲染辅助函数 ---

  // 高亮上下文中的单词 - [修复] 适配 Dark Mode 颜色
  const renderContext = (
    text?: string | null,
    word?: string,
    hideWord: boolean = false,
  ) => {
    if (!text || !word)
      return (
        <p className="text-slate-400 dark:text-slate-500 italic">暂无例句</p>
      );
    const parts = text.split(new RegExp(`(${word})`, "gi"));
    return (
      <p className="leading-relaxed font-serif text-slate-700 dark:text-slate-300 text-lg">
        "
        {parts.map((part, i) =>
          part.toLowerCase() === word.toLowerCase() ? (
            hideWord ? (
              <span
                key={i}
                className="inline-block w-20 border-b-2 border-indigo-300 dark:border-indigo-700 mx-1 align-bottom bg-indigo-50/50 dark:bg-indigo-900/20"
              ></span>
            ) : (
              <span
                key={i}
                className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-1 rounded"
              >
                {part}
              </span>
            )
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
        "
      </p>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* 1. 头部与统计面板 */}
      <header className="flex flex-col md:flex-row justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-6 gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
            <BookOpenCheck
              className="mr-3 text-indigo-600 dark:text-indigo-400"
              size={32}
            />
            生词本
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            管理你的生词收藏并进行科学的间隔复习。
          </p>
        </div>

        <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm min-w-[140px]">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg">
              <BookOpen size={18} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                总计
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {stats.total}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm min-w-[140px]">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
              <Clock size={18} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                今日待复习
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {stats.due}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm min-w-[140px]">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Award size={18} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                已掌握
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {stats.mastered}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. 复习入口 (SRS) */}
      <section className="grid grid-cols-1 gap-6">
        {stats.due > 0 ? (
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-indigo-950 dark:to-slate-900 dark:border dark:border-indigo-900/50 rounded-2xl p-8 text-white flex flex-col sm:flex-row items-center justify-between shadow-xl shadow-slate-200 dark:shadow-none">
            <div className="mb-6 sm:mb-0">
              <h2 className="text-2xl font-bold flex items-center mb-2">
                <BrainCircuit className="mr-3 text-indigo-400" />
                复习计划已就绪
              </h2>
              <p className="text-slate-300 dark:text-slate-400 max-w-lg">
                根据遗忘曲线，你有{" "}
                <span className="text-white font-bold">{stats.due} 个生词</span>{" "}
                需要复习。请优先关注语境而非死记硬背。
              </p>
            </div>
            <button
              onClick={startReview}
              className="bg-white dark:bg-slate-200 text-slate-900 px-8 py-3 rounded-full font-bold hover:bg-indigo-50 dark:hover:bg-slate-100 transition-colors shadow-lg flex items-center shrink-0"
            >
              <PlayCircle className="mr-2" size={20} />
              开始复习
            </button>
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-dashed rounded-2xl p-6 text-center text-slate-500 dark:text-slate-400 transition-colors">
            <CheckCircle className="mx-auto mb-2 text-emerald-500" size={32} />
            <h3 className="font-medium text-slate-900 dark:text-slate-200">
              全部完成了！
            </h3>
            <p className="text-sm">
              你做得很好，今日复习任务已清空。快去听播客添加新词吧。
            </p>
          </div>
        )}
      </section>

      {/* 3. 列表控制栏 */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
        <div className="relative w-full sm:w-96">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="搜索单词或释义..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-slate-200 dark:placeholder-slate-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase mr-1 whitespace-nowrap">
            排序:
          </span>
          {[
            { id: "review", label: "复习时间" },
            { id: "added", label: "添加时间" },
            { id: "alpha", label: "A-Z" },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() =>
                setSortMethod(opt.id as "review" | "added" | "alpha")
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                sortMethod === opt.id
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. 生词列表视图 */}
      <div className="grid grid-cols-1 gap-4">
        {filteredList.map((item) => {
          const isExpanded = expandedId === item.vocabularyid;
          const due = isDue(item.nextReviewAt);

          return (
            <div
              key={item.vocabularyid}
              onClick={() =>
                setExpandedId(isExpanded ? null : item.vocabularyid)
              }
              className={`bg-white dark:bg-slate-900 rounded-xl border transition-all cursor-pointer overflow-hidden ${
                isExpanded
                  ? "border-indigo-200 dark:border-indigo-800 shadow-md ring-1 ring-indigo-50 dark:ring-indigo-900/30"
                  : "border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900/50 hover:shadow-sm"
              }`}
            >
              {/* 卡片摘要行 */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* 状态指示点 */}
                  <div
                    className={`w-2 h-2 rounded-full ${
                      due
                        ? "bg-orange-500 animate-pulse"
                        : "bg-slate-300 dark:bg-slate-600"
                    }`}
                    title={due ? "需要复习" : "未到期"}
                  />

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                        {item.word}
                      </h3>
                      {item.speakUrl && (
                        <button
                          onClick={(e) => playAudio(e, item.speakUrl)}
                          className="p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors shrink-0"
                        >
                          <Volume2 size={16} />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[150px] sm:max-w-md">
                      {item.definition || "暂无定义"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-6 shrink-0">
                  {/* 熟练度条 */}
                  <div className="hidden sm:flex flex-col items-end">
                    <div className="flex space-x-1 mb-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`w-1.5 h-6 rounded-full ${
                            level <= item.proficiency
                              ? "bg-indigo-500"
                              : "bg-slate-100 dark:bg-slate-800"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 日期徽章 */}
                  <div className="text-right min-w-[80px]">
                    <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                      下次复习
                    </div>
                    <div
                      className={`text-xs font-medium ${
                        due
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {due ? "今天" : formatDate(item.nextReviewAt)}
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp
                      size={20}
                      className="text-slate-300 dark:text-slate-600"
                    />
                  ) : (
                    <ChevronDown
                      size={20}
                      className="text-slate-300 dark:text-slate-600"
                    />
                  )}
                </div>
              </div>

              {/* 展开的详情面板 */}
              {isExpanded && (
                <div
                  className="bg-slate-50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800 p-6 animate-in slide-in-from-top-2 duration-200 cursor-default"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">
                          例句
                        </h4>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                          {renderContext(item.contextSentence, item.word)}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                          中文
                        </h4>
                        <p className="text-slate-700 dark:text-slate-300">
                          {item.translation || "暂无翻译"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 border-l border-slate-200 dark:border-slate-800 pl-0 md:pl-6">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">
                          来源
                        </h4>
                        <div className="flex items-center space-x-3 text-sm text-slate-600 dark:text-slate-300">
                          <PlayCircle size={16} className="text-indigo-500" />
                          <span className="font-medium truncate">
                            {item.episodeTitle}
                          </span>
                        </div>
                        {item.timestamp && (
                          <div className="mt-1 ml-7 text-xs text-slate-400 dark:text-slate-500">
                            时间点 {Math.floor(item.timestamp / 60)}:
                            {(item.timestamp % 60).toString().padStart(2, "0")}
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">
                          操作
                        </h4>
                        <div className="flex space-x-2">
                          {item.webUrl && (
                            <a
                              href={item.webUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:border-indigo-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-center"
                            >
                              查看词典
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredList.length === 0 && (
          <div className="py-12 text-center text-slate-400 dark:text-slate-600">
            <Filter size={48} className="mx-auto mb-4 opacity-20" />
            <p>未找到匹配的生词。</p>
          </div>
        )}
      </div>

      {/* 5. 复习会话模态框 */}
      {isReviewOpen && reviewQueue.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[500px] animate-in zoom-in-95 duration-200 border dark:border-slate-800">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center space-x-2">
                <BrainCircuit
                  className="text-indigo-600 dark:text-indigo-400"
                  size={20}
                />
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  复习中
                </span>
                <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full">
                  {currentReviewIndex + 1} / {reviewQueue.length}
                </span>
              </div>
              <button
                onClick={() => setIsReviewOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Flashcard Body */}
            <div className="flex-1 flex flex-col relative">
              {/* 正反面切换区域 */}
              <div
                className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 text-center cursor-pointer hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors"
                onClick={() => !isCardFlipped && setIsCardFlipped(true)}
              >
                {!isCardFlipped ? (
                  // 正面: 先展示例句（挖空）
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      补全句子
                    </div>
                    <div className="text-2xl md:text-3xl leading-relaxed font-serif text-slate-800 dark:text-slate-100">
                      {renderContext(
                        reviewQueue[currentReviewIndex].contextSentence,
                        reviewQueue[currentReviewIndex].word,
                        true,
                      )}
                    </div>
                    <div className="text-sm text-indigo-400 italic mt-8 animate-pulse">
                      点击显示答案
                    </div>
                  </div>
                ) : (
                  // 背面: 完整信息
                  <div className="space-y-6 w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div>
                      <h2 className="text-4xl font-bold text-indigo-700 dark:text-indigo-400 mb-2">
                        {reviewQueue[currentReviewIndex].word}
                      </h2>
                      <div className="flex items-center justify-center space-x-2 text-slate-500 dark:text-slate-400">
                        <span>
                          {reviewQueue[currentReviewIndex].definition}
                        </span>
                        {reviewQueue[currentReviewIndex].speakUrl && (
                          <button
                            onClick={(e) =>
                              playAudio(
                                e,
                                reviewQueue[currentReviewIndex].speakUrl,
                              )
                            }
                            className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 rounded-full"
                          >
                            <Volume2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-indigo-50 dark:bg-indigo-950/30 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                      {renderContext(
                        reviewQueue[currentReviewIndex].contextSentence,
                        reviewQueue[currentReviewIndex].word,
                        false,
                      )}
                    </div>

                    <div className="text-sm text-slate-400 dark:text-slate-500">
                      {reviewQueue[currentReviewIndex].translation}
                    </div>
                  </div>
                )}
              </div>

              {/* 控制栏 Footer */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                {!isCardFlipped ? (
                  <button
                    onClick={() => setIsCardFlipped(true)}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-[0.98]"
                  >
                    显示答案
                  </button>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleSRS(ReviewQuality.FORGOT)}
                      className="flex flex-col items-center p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-all group disabled:opacity-50"
                    >
                      <RotateCcw
                        size={20}
                        className="mb-1 group-hover:scale-110 transition-transform"
                      />
                      <span className="text-xs font-bold uppercase">忘记</span>
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleSRS(ReviewQuality.HARD)}
                      className="flex flex-col items-center p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 transition-all group disabled:opacity-50"
                    >
                      <Clock
                        size={20}
                        className="mb-1 group-hover:scale-110 transition-transform"
                      />
                      <span className="text-xs font-bold uppercase">模糊</span>
                      <span className="text-[10px] opacity-60">1天</span>
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleSRS(ReviewQuality.GOOD)}
                      className="flex flex-col items-center p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all group disabled:opacity-50"
                    >
                      <CheckCircle
                        size={20}
                        className="mb-1 group-hover:scale-110 transition-transform"
                      />
                      <span className="text-xs font-bold uppercase">认识</span>
                      <span className="text-[10px] opacity-60">3天</span>
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleSRS(ReviewQuality.EASY)}
                      className="flex flex-col items-center p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all group disabled:opacity-50"
                    >
                      <Award
                        size={20}
                        className="mb-1 group-hover:scale-110 transition-transform"
                      />
                      <span className="text-xs font-bold uppercase">简单</span>
                      <span className="text-[10px] opacity-60">7天</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VocabularyNotebook;
