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

  // 高亮上下文中的单词
  const renderContext = (
    text?: string | null,
    word?: string,
    hideWord: boolean = false,
  ) => {
    if (!text || !word)
      return <p className="text-base-content/40 italic">暂无例句</p>;
    const parts = text.split(new RegExp(`(${word})`, "gi"));
    return (
      <p className="leading-relaxed font-serif text-base-content/80 text-lg">
        "
        {parts.map((part, i) =>
          part.toLowerCase() === word.toLowerCase() ? (
            hideWord ? (
              <span
                key={i}
                className="inline-block w-20 border-b-2 border-primary mx-1 align-bottom bg-primary/10"
              ></span>
            ) : (
              <span
                key={i}
                className="font-bold text-primary bg-primary/20 px-1 rounded"
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 xl:py-8 space-y-6 xl:space-y-8 font-sans">
      {/* 1. 头部与统计面板 */}
      <header className="flex flex-col xl:flex-row justify-between xl:items-end border-b border-base-200 pb-6 gap-6">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold text-base-content flex items-center">
            <BookOpenCheck className="mr-3 text-primary" size={32} />
            生词本
          </h1>
          <p className="text-base-content/60 mt-2 text-sm xl:text-base">
            管理你的生词收藏并进行科学的间隔复习。
          </p>
        </div>

        {/* 统计卡片：Mobile (<xl) 使用 Grid，Desktop (>=xl) 使用 Flex 行 */}
        <div className="w-full xl:w-auto">
          <div className="grid grid-cols-3 gap-2 xl:flex xl:gap-4 xl:overflow-x-auto">
            {/* Total Card */}
            <div className="flex flex-col items-center justify-center xl:flex-row xl:justify-start xl:space-x-3 bg-base-100 px-2 py-3 xl:px-4 xl:py-3 rounded-xl border border-base-200 shadow-sm xl:min-w-[140px]">
              <div className="p-1.5 xl:p-2 bg-base-200 text-base-content/60 rounded-lg mb-1 xl:mb-0">
                <BookOpen size={16} className="xl:w-[18px] xl:h-[18px]" />
              </div>
              <div className="text-center xl:text-left">
                <div className="text-[10px] uppercase font-bold text-base-content/40">
                  总计
                </div>
                <div className="text-lg xl:text-xl font-bold text-base-content">
                  {stats.total}
                </div>
              </div>
            </div>

            {/* Due Card */}
            <div className="flex flex-col items-center justify-center xl:flex-row xl:justify-start xl:space-x-3 bg-base-100 px-2 py-3 xl:px-4 xl:py-3 rounded-xl border border-base-200 shadow-sm xl:min-w-[140px]">
              <div className="p-1.5 xl:p-2 bg-warning/10 text-warning rounded-lg mb-1 xl:mb-0">
                <Clock size={16} className="xl:w-[18px] xl:h-[18px]" />
              </div>
              <div className="text-center xl:text-left">
                <div className="text-[10px] uppercase font-bold text-base-content/40">
                  待复习
                </div>
                <div className="text-lg xl:text-xl font-bold text-base-content">
                  {stats.due}
                </div>
              </div>
            </div>

            {/* Mastered Card */}
            <div className="flex flex-col items-center justify-center xl:flex-row xl:justify-start xl:space-x-3 bg-base-100 px-2 py-3 xl:px-4 xl:py-3 rounded-xl border border-base-200 shadow-sm xl:min-w-[140px]">
              <div className="p-1.5 xl:p-2 bg-success/10 text-success rounded-lg mb-1 xl:mb-0">
                <Award size={16} className="xl:w-[18px] xl:h-[18px]" />
              </div>
              <div className="text-center xl:text-left">
                <div className="text-[10px] uppercase font-bold text-base-content/40">
                  已掌握
                </div>
                <div className="text-lg xl:text-xl font-bold text-base-content">
                  {stats.mastered}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. 复习入口 (SRS) */}
      <section className="grid grid-cols-1 gap-6">
        {stats.due > 0 ? (
          <div className="bg-neutral rounded-2xl p-6 xl:p-8 text-neutral-content flex flex-col sm:flex-row items-center justify-between shadow-xl gap-6 sm:gap-0">
            <div>
              <h2 className="text-xl xl:text-2xl font-bold flex items-center mb-2">
                <BrainCircuit className="mr-3 text-primary" />
                复习计划已就绪
              </h2>
              <p className="text-neutral-content/80 max-w-lg text-sm xl:text-base">
                根据遗忘曲线，你有{" "}
                <span className="text-white font-bold">{stats.due} 个生词</span>{" "}
                需要复习。
              </p>
            </div>
            <button
              onClick={startReview}
              className="w-full sm:w-auto bg-primary text-primary-content px-8 py-3 rounded-full font-bold hover:brightness-110 transition-colors shadow-lg flex items-center justify-center shrink-0"
            >
              <PlayCircle className="mr-2" size={20} />
              开始复习
            </button>
          </div>
        ) : (
          <div className="bg-base-200/50 border border-base-200 border-dashed rounded-2xl p-6 text-center text-base-content/60 transition-colors">
            <CheckCircle className="mx-auto mb-2 text-success" size={32} />
            <h3 className="font-medium text-base-content">全部完成了！</h3>
            <p className="text-sm">
              你做得很好，今日复习任务已清空。快去听播客添加新词吧。
            </p>
          </div>
        )}
      </section>

      {/* 3. 列表控制栏 */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-base-100 p-3 rounded-xl border border-base-200 shadow-sm transition-colors sticky top-0 z-10 xl:static">
        <div className="relative w-full xl:w-96">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40"
            size={18}
          />
          <input
            type="text"
            placeholder="搜索单词或释义..."
            className="w-full pl-10 pr-4 py-2 bg-base-200/50 border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-base-content placeholder-base-content/40"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0 scrollbar-hide">
          <span className="text-xs font-semibold text-base-content/40 uppercase mr-1 whitespace-nowrap hidden xl:inline">
            排序:
          </span>
          <div className="flex w-full xl:w-auto gap-2">
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
                className={`flex-1 xl:flex-none px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  sortMethod === opt.id
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-base-content/60 hover:bg-base-200 border border-transparent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
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
              className={`bg-base-100 rounded-xl border transition-all cursor-pointer overflow-hidden ${
                isExpanded
                  ? "border-primary/30 shadow-md ring-1 ring-primary/20"
                  : "border-base-200 hover:border-primary/50 hover:shadow-sm"
              }`}
            >
              {/* 卡片内容区: Mobile为垂直布局，Desktop为水平布局 */}
              <div className="p-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 xl:gap-0">
                {/* 左侧：单词与定义 */}
                <div className="flex flex-row items-start space-x-4 w-full xl:w-auto">
                  {/* 状态指示点 (Desktop) / 状态条 (Mobile) */}
                  <div
                    className={`hidden xl:block w-2 h-2 rounded-full mt-2.5 xl:mt-0 shrink-0 ${
                      due ? "bg-warning animate-pulse" : "bg-base-300"
                    }`}
                    title={due ? "需要复习" : "未到期"}
                  />

                  <div className="min-w-0 flex-1">
                    {/* Word Row */}
                    <div className="flex items-center justify-between xl:justify-start space-x-2 mb-1 xl:mb-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-base-content truncate">
                          {item.word}
                        </h3>
                        {/* Mobile: 状态指示点在标题旁 */}
                        <div
                          className={`xl:hidden w-2 h-2 rounded-full ${
                            due ? "bg-warning" : "bg-base-300"
                          }`}
                        />
                      </div>
                      {item.speakUrl && (
                        <button
                          onClick={(e) => playAudio(e, item.speakUrl)}
                          className="p-1.5 text-base-content/40 hover:text-primary rounded-full bg-base-200 xl:bg-transparent transition-colors shrink-0"
                        >
                          <Volume2 size={16} />
                        </button>
                      )}
                    </div>
                    {/* Definition Row */}
                    <p className="text-sm text-base-content/60 truncate w-full xl:max-w-md">
                      {item.definition || "暂无定义"}
                    </p>
                  </div>
                </div>

                {/* 右侧：统计数据与箭头 (Mobile: 底部行, Desktop: 右侧) */}
                <div className="flex items-center justify-between xl:justify-end xl:space-x-6 shrink-0 w-full xl:w-auto pt-2 xl:pt-0 border-t border-base-200/50 xl:border-none">
                  {/* 熟练度条 */}
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`w-1.5 h-4 xl:h-6 rounded-full ${
                          level <= item.proficiency
                            ? "bg-primary"
                            : "bg-base-200"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* 日期徽章 */}
                    <div className="text-right min-w-[80px]">
                      <div className="hidden xl:block text-[10px] uppercase font-bold text-base-content/40">
                        下次复习
                      </div>
                      <div
                        className={`text-xs font-medium ${
                          due ? "text-warning" : "text-base-content/80"
                        }`}
                      >
                        {due ? (
                          <span className="flex items-center justify-end">
                            <Clock size={12} className="mr-1 xl:hidden" />
                            复习
                          </span>
                        ) : (
                          formatDate(item.nextReviewAt)
                        )}
                      </div>
                    </div>

                    {isExpanded ? (
                      <ChevronUp size={20} className="text-base-content/30" />
                    ) : (
                      <ChevronDown size={20} className="text-base-content/30" />
                    )}
                  </div>
                </div>
              </div>

              {/* 展开的详情面板 */}
              {isExpanded && (
                <div
                  className="bg-base-200/30 border-t border-base-200 p-4 xl:p-6 animate-in slide-in-from-top-2 duration-200 cursor-default"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-base-content/40 uppercase mb-2">
                          例句
                        </h4>
                        <div className="bg-base-100 p-4 rounded-xl border border-base-200 shadow-sm">
                          {renderContext(item.contextSentence, item.word)}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-base-content/40 uppercase mb-1">
                          中文
                        </h4>
                        <p className="text-base-content/80">
                          {item.translation || "暂无翻译"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 border-l-0 md:border-l border-base-200 pl-0 md:pl-6">
                      <div>
                        <h4 className="text-xs font-bold text-base-content/40 uppercase mb-2">
                          来源
                        </h4>
                        <div className="flex items-center space-x-3 text-sm text-base-content/80">
                          <PlayCircle size={16} className="text-primary" />
                          <span className="font-medium truncate">
                            {item.episodeTitle}
                          </span>
                        </div>
                        {item.timestamp && (
                          <div className="mt-1 ml-7 text-xs text-base-content/40">
                            时间点 {Math.floor(item.timestamp / 60)}:
                            {(item.timestamp % 60).toString().padStart(2, "0")}
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-base-content/40 uppercase mb-2">
                          操作
                        </h4>
                        <div className="flex space-x-2">
                          {item.webUrl && (
                            <a
                              href={item.webUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 px-3 py-2 bg-base-100 border border-base-200 rounded-lg text-sm text-base-content/80 hover:border-primary/50 hover:text-primary transition-colors text-center"
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
          <div className="py-12 text-center text-base-content/40">
            <Filter size={48} className="mx-auto mb-4 opacity-20" />
            <p>未找到匹配的生词。</p>
          </div>
        )}
      </div>

      {/* 5. 复习会话模态框 */}
      {isReviewOpen && reviewQueue.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 xl:p-4 bg-neutral/70 backdrop-blur-sm">
          <div className="bg-base-100 w-full h-full xl:h-auto max-w-none xl:max-w-2xl rounded-none xl:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border-none xl:border">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-base-200 flex justify-between items-center bg-base-200/50 shrink-0 mt-safe xl:mt-0">
              <div className="flex items-center space-x-2">
                <BrainCircuit className="text-primary" size={20} />
                <span className="font-bold text-base-content/90">复习中</span>
                <span className="bg-base-300 text-base-content/80 text-xs px-2 py-0.5 rounded-full">
                  {currentReviewIndex + 1} / {reviewQueue.length}
                </span>
              </div>
              <button
                onClick={() => setIsReviewOpen(false)}
                className="p-2 hover:bg-base-300 rounded-full text-base-content/40 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Flashcard Body */}
            <div className="flex-1 flex flex-col relative overflow-y-auto">
              {/* 正反面切换区域 */}
              <div
                className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 text-center cursor-pointer hover:bg-base-200/30 transition-colors min-h-[300px]"
                onClick={() => !isCardFlipped && setIsCardFlipped(true)}
              >
                {!isCardFlipped ? (
                  // 正面: 先展示例句（挖空）
                  <div className="space-y-8 animate-in fade-in duration-300 max-w-lg mx-auto">
                    <div className="text-sm font-bold text-base-content/40 uppercase tracking-widest">
                      补全句子
                    </div>
                    <div className="text-xl md:text-3xl leading-relaxed font-serif text-base-content">
                      {renderContext(
                        reviewQueue[currentReviewIndex].contextSentence,
                        reviewQueue[currentReviewIndex].word,
                        true,
                      )}
                    </div>
                    <div className="text-sm text-primary italic mt-8 animate-pulse">
                      点击显示答案
                    </div>
                  </div>
                ) : (
                  // 背面: 完整信息
                  <div className="space-y-6 w-full max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20 xl:pb-0">
                    <div>
                      <h2 className="text-3xl xl:text-4xl font-bold text-primary mb-2 break-words">
                        {reviewQueue[currentReviewIndex].word}
                      </h2>
                      <div className="flex items-center justify-center space-x-2 text-base-content/60">
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
                            className="p-1 hover:text-primary bg-base-200 rounded-full"
                          >
                            <Volume2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                      {renderContext(
                        reviewQueue[currentReviewIndex].contextSentence,
                        reviewQueue[currentReviewIndex].word,
                        false,
                      )}
                    </div>

                    <div className="text-sm text-base-content/40">
                      {reviewQueue[currentReviewIndex].translation}
                    </div>
                  </div>
                )}
              </div>

              {/* 控制栏 Footer */}
              <div className="p-4 xl:p-6 border-t border-base-200 bg-base-200/50 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))] xl:pb-6">
                {!isCardFlipped ? (
                  <button
                    onClick={() => setIsCardFlipped(true)}
                    className="w-full py-4 bg-primary text-primary-content rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-focus transition-all active:scale-[0.98]"
                  >
                    显示答案
                  </button>
                ) : (
                  <div className="grid grid-cols-4 gap-2 xl:gap-3">
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleSRS(ReviewQuality.FORGOT)}
                      className="flex flex-col items-center p-2 xl:p-3 rounded-xl bg-base-100 border border-base-200 hover:border-error/50 hover:bg-error/10 text-base-content/80 hover:text-error transition-all group disabled:opacity-50"
                    >
                      <RotateCcw
                        size={20}
                        className="mb-1 group-hover:scale-110 transition-transform"
                      />
                      <span className="text-[10px] xl:text-xs font-bold uppercase">
                        忘记
                      </span>
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleSRS(ReviewQuality.HARD)}
                      className="flex flex-col items-center p-2 xl:p-3 rounded-xl bg-base-100 border border-base-200 hover:border-warning/50 hover:bg-warning/10 text-base-content/80 hover:text-warning transition-all group disabled:opacity-50"
                    >
                      <Clock
                        size={20}
                        className="mb-1 group-hover:scale-110 transition-transform"
                      />
                      <span className="text-[10px] xl:text-xs font-bold uppercase">
                        模糊
                      </span>
                      <span className="text-[10px] opacity-60">1天</span>
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleSRS(ReviewQuality.GOOD)}
                      className="flex flex-col items-center p-2 xl:p-3 rounded-xl bg-base-100 border border-base-200 hover:border-success/50 hover:bg-success/10 text-base-content/80 hover:text-success transition-all group disabled:opacity-50"
                    >
                      <CheckCircle
                        size={20}
                        className="mb-1 group-hover:scale-110 transition-transform"
                      />
                      <span className="text-[10px] xl:text-xs font-bold uppercase">
                        认识
                      </span>
                      <span className="text-[10px] opacity-60">3天</span>
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleSRS(ReviewQuality.EASY)}
                      className="flex flex-col items-center p-2 xl:p-3 rounded-xl bg-base-100 border border-base-200 hover:border-info/50 hover:bg-info/10 text-base-content/80 hover:text-info transition-all group disabled:opacity-50"
                    >
                      <Award
                        size={20}
                        className="mb-1 group-hover:scale-110 transition-transform"
                      />
                      <span className="text-[10px] xl:text-xs font-bold uppercase">
                        简单
                      </span>
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
