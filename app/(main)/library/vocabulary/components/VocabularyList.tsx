import {
  Volume2,
  ChevronDown,
  ChevronUp,
  Clock,
  PlayCircle,
  Podcast,
  Filter,
  CheckCircle,
  RefreshCcw,
  BookOpen,
  History,
  Sparkles,
  Tags,
  Activity,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";
import {
  isDue,
  formatDate,
  UseVocabularyNotebookReturn,
} from "../hooks/useVocabularyNotebook";
import { useOriginalAudio } from "../hooks/useOriginalAudio";
import { VocabularyItem } from "../VocabularyNotebook";
import { renderContext } from "./ContextRenderer";

export function VocabularyList({
  hookOptions,
}: {
  hookOptions: UseVocabularyNotebookReturn;
}) {
  const {
    filteredList,
    expandedId,
    setExpandedId,
    playAudio,
    playContextAudio,
    playingText,
    stopAllAudio,
    toggleStatus,
    deleteVocabulary,
  } = hookOptions;

  const [deletingId, setDeletingId] = useState<number | null>(null);
  // 剧集原声播放（字幕对齐，与语音评测同款实现）
  const {
    play: playOriginal,
    playingKey: originalPlayingKey,
    loadingKey: originalLoadingKey,
  } = useOriginalAudio({ onBeforePlay: stopAllAudio });

  return (
    <>
      <div className="grid grid-cols-1 gap-4 pb-[60vh] md:pb-[70vh]">
        {filteredList.map((item: VocabularyItem) => {
          const isExpanded = expandedId === item.vocabularyid;
          const due = isDue(item.nextReviewAt);
          const hasRichData = !!item.dictData;

          return (
            <div
              key={item.vocabularyid}
              id={`vocab-card-${item.vocabularyid}`}
              onClick={(e) => {
                const expanding = !isExpanded;
                if (expanding) {
                  const target = e.currentTarget;
                  const isMobile = window.innerWidth < 768;
                  const isTablet =
                    window.innerWidth >= 768 && window.innerWidth < 1280;
                  const offset = isMobile ? 160 : isTablet ? 240 : 112;

                  let lostHeight = 0;
                  if (expandedId) {
                    const prevExpandedEl = document.getElementById(
                      `vocab-card-${expandedId}`,
                    );
                    if (prevExpandedEl) {
                      const prevRect = prevExpandedEl.getBoundingClientRect();
                      const targetRect = target.getBoundingClientRect();
                      // 如果之前展开的卡片在当前点击的卡片上方，它的收缩会导致当前卡片上移
                      if (prevRect.top < targetRect.top) {
                        const panelEl = prevExpandedEl.querySelector(
                          ".grid.transition-all",
                        );
                        if (panelEl) {
                          lostHeight = panelEl.getBoundingClientRect().height;
                        }
                      }
                    }
                  }

                  const targetRect = target.getBoundingClientRect();
                  // 目标最终的位置 = 当前位置 - 之前卡片收缩导致丢失的高度
                  // 我们需要滚动的距离 = 目标最终的位置 - 我们期望的停留位置 (offset)
                  const distanceToScroll = targetRect.top - lostHeight - offset;

                  // 同步触发原生平滑滚动，iOS Safari 对同步触发的 scrollBy 支持最完美
                  window.scrollBy({
                    top: distanceToScroll,
                    behavior: "smooth",
                  });
                }
                setExpandedId(expanding ? item.vocabularyid : null);
              }}
              className={`group relative rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden scroll-mt-[160px] md:scroll-mt-[240px] xl:scroll-mt-28 ${
                isExpanded
                  ? "bg-white/80 dark:bg-ink-900/80 backdrop-blur-md shadow-xl ring-1 ring-primary/30 z-20"
                  : "bg-white dark:bg-ink-900 shadow-sm hover:shadow-md hover:ring-1 hover:ring-primary/20 z-10"
              }`}
            >
              {/* 卡片内容区: 紧凑视图 */}
              <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 xl:gap-0 relative z-10">
                {/* 左侧：单词与定义 */}
                <div className="flex flex-row items-start space-x-4 w-full xl:w-auto">
                  {/* 状态点 */}
                  <div
                    className={`hidden xl:block w-2.5 h-2.5 rounded-full mt-2.5 xl:mt-0 shrink-0 shadow-sm ${
                      due && item.status !== "MASTERED"
                        ? "bg-warning animate-pulse shadow-warning/50"
                        : "bg-ink-200 dark:bg-ink-700"
                    }`}
                    title={
                      due && item.status !== "MASTERED" ? "需要复习" : "未到期"
                    }
                  />

                  <div className="min-w-0 flex-1">
                    {/* Word Row */}
                    <div className="flex items-center justify-between xl:justify-start space-x-3 mb-1.5 xl:mb-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-xl font-extrabold text-base-content truncate tracking-tight">
                          {item.word}
                        </h3>
                        {/* 音标 (若有rich data) */}
                        {hasRichData &&
                          (item.dictData?.phonetics?.us ||
                            item.dictData?.phonetics?.uk) && (
                            <span className="hidden md:inline-block px-2 py-0.5 rounded-md bg-ink-50 dark:bg-ink-800 text-xs text-base-content/60 font-mono">
                              {item.dictData.phonetics.us ||
                                item.dictData.phonetics.uk}
                            </span>
                          )}
                        {/* Mobile: 状态指示点在标题旁 */}
                        <div
                          className={`xl:hidden w-2.5 h-2.5 rounded-full ${
                            due && item.status !== "MASTERED"
                              ? "bg-warning animate-pulse"
                              : "bg-ink-200 dark:bg-ink-700"
                          }`}
                        />
                      </div>
                      {/* 发音按钮 (简易版) */}
                      {(item.speakUrl || item.dictData?.audio_urls?.us) &&
                        !isExpanded && (
                          <button
                            onClick={(e) =>
                              playAudio(
                                e,
                                item.dictData?.audio_urls?.us || item.speakUrl,
                              )
                            }
                            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-primary/60 hover:text-primary hover:bg-primary/10 active:scale-90 rounded-full transition-all shrink-0"
                          >
                            <Volume2 size={20} />
                          </button>
                        )}
                    </div>
                    {/* Definition Row */}
                    <p className="text-sm font-medium text-base-content/60 truncate w-full xl:max-w-xl">
                      {hasRichData && item.dictData?.definitions?.[0]
                        ? item.dictData.definitions[0].meaning_cn
                        : item.definition || "暂无定义"}
                    </p>
                  </div>
                </div>

                {/* 右侧：统计数据与箭头 */}
                <div className="flex items-center justify-between xl:justify-end xl:space-x-8 shrink-0 w-full xl:w-auto pt-3 xl:pt-0 border-t border-base-200/50 xl:border-none">
                  {/* 熟练度条 (微动画) */}
                  <div
                    className="flex items-center space-x-1.5"
                    title={`熟练度: ${item.proficiency}/5`}
                  >
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`w-1.5 xl:w-2 rounded-full transition-all duration-500 ${
                          level <= item.proficiency
                            ? "h-4 xl:h-6 bg-gradient-to-t from-primary to-primary-400 shadow-sm shadow-primary/20"
                            : "h-3 xl:h-4 bg-ink-100 dark:bg-ink-800"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* 日期徽章 */}
                    {item.status !== "MASTERED" ? (
                      <div className="text-right min-w-[85px]">
                        <div className="hidden xl:block text-[10px] tracking-wider uppercase font-bold text-base-content/40 mb-0.5">
                          下次复习
                        </div>
                        <div
                          className={`text-sm font-bold ${
                            due ? "text-warning" : "text-base-content/80"
                          }`}
                        >
                          {due ? (
                            <span className="flex items-center justify-end animate-pulse">
                              <Clock size={14} className="mr-1 xl:hidden" />
                              需要复习
                            </span>
                          ) : (
                            formatDate(item.nextReviewAt)
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-right min-w-[85px]">
                        <div className="text-sm font-bold text-success flex items-center justify-end">
                          <CheckCircle size={16} className="mr-1.5" /> 已掌握
                        </div>
                      </div>
                    )}

                    <div
                      className={`p-1.5 rounded-full transition-colors ${isExpanded ? "bg-base-200 dark:bg-ink-800" : "group-hover:bg-ink-50 dark:group-hover:bg-ink-800"}`}
                    >
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-base-content/50" />
                      ) : (
                        <ChevronDown
                          size={20}
                          className="text-base-content/50"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 展开的详情面板 */}
              <div
                className={`grid transition-all duration-300 ease-in-out cursor-default ${
                  isExpanded
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-base-200/50 bg-gradient-to-b from-transparent to-base-200/30 dark:to-ink-900/30">
                    {hasRichData ? (
                      /* --- 丰富数据视图 (Rich View) --- */
                      <div className="p-4 sm:p-6 space-y-8">
                        {/* Header: 音标与发音 (Glassmorphism Pilles) */}
                        <div className="flex flex-wrap items-center gap-4">
                          {item.dictData?.phonetics?.us && (
                            <div className="flex items-center space-x-3 bg-white/60 dark:bg-ink-800/60 backdrop-blur-md px-4 py-2 rounded-xl shadow-sm ring-1 ring-base-200 dark:ring-base-content/10">
                              <span className="text-xs font-black text-primary uppercase tracking-widest">
                                US
                              </span>
                              <span className="text-sm font-mono text-base-content/80">
                                {item.dictData.phonetics.us}
                              </span>
                              {item.dictData.audio_urls?.us && (
                                <button
                                  onClick={(e) =>
                                    playAudio(e, item.dictData!.audio_urls!.us)
                                  }
                                  className="text-primary/70 hover:text-primary hover:scale-110 active:scale-95 transition-all"
                                >
                                  <Volume2 size={18} />
                                </button>
                              )}
                            </div>
                          )}
                          {item.dictData?.phonetics?.uk && (
                            <div className="flex items-center space-x-3 bg-white/60 dark:bg-ink-800/60 backdrop-blur-md px-4 py-2 rounded-xl shadow-sm ring-1 ring-base-200 dark:ring-base-content/10">
                              <span className="text-xs font-black text-secondary uppercase tracking-widest">
                                UK
                              </span>
                              <span className="text-sm font-mono text-base-content/80">
                                {item.dictData.phonetics.uk}
                              </span>
                              {item.dictData.audio_urls?.uk && (
                                <button
                                  onClick={(e) =>
                                    playAudio(e, item.dictData!.audio_urls!.uk)
                                  }
                                  className="text-secondary/70 hover:text-secondary hover:scale-110 active:scale-95 transition-all"
                                >
                                  <Volume2 size={18} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                          {/* 左栏：释义与例句 */}
                          <div className="lg:col-span-7 space-y-8">
                            {/* 核心释义区 */}
                            {item.dictData?.definitions &&
                              item.dictData.definitions.length > 0 && (
                                <section>
                                  <h4 className="flex items-center text-sm font-extrabold text-base-content/80 mb-4 tracking-wide">
                                    <BookOpen
                                      size={16}
                                      className="mr-2 text-primary"
                                    />
                                    核心释义
                                  </h4>
                                  <div className="space-y-4">
                                    {item.dictData.definitions.map(
                                      (def, idx) => (
                                        <div
                                          key={idx}
                                          className="relative overflow-hidden bg-white/80 dark:bg-ink-800/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm ring-1 ring-base-200 dark:ring-base-content/5 flex flex-col sm:flex-row gap-3 sm:gap-5"
                                        >
                                          {/* 左侧彩色指示条 */}
                                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/50 to-primary rounded-l-2xl"></div>

                                          <div className="flex items-start gap-2 sm:flex-col sm:w-20 shrink-0 pl-2">
                                            <span className="px-2.5 py-1 bg-primary/10 dark:bg-primary/20 text-primary-700 dark:text-primary-300 text-xs font-bold rounded-lg shadow-sm border border-primary/20">
                                              {def.pos}
                                            </span>
                                            {def.cefr_level && (
                                              <span className="px-2 py-0.5 bg-info/10 text-info-700 dark:text-info-300 text-[10px] font-bold rounded-md uppercase tracking-wider">
                                                {def.cefr_level}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex-1 space-y-1.5">
                                            <p className="text-base font-bold text-base-content">
                                              {def.meaning_cn}
                                            </p>
                                            {def.meaning_en && (
                                              <p className="text-sm text-base-content/60 leading-relaxed">
                                                {def.meaning_en}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </section>
                              )}

                            {/* 例句区 */}
                            <section>
                              <h4 className="flex items-center text-sm font-extrabold text-base-content/80 mb-4 tracking-wide">
                                <Sparkles
                                  size={16}
                                  className="mr-2 text-secondary"
                                />
                                语境与例句
                              </h4>
                              <div className="space-y-4">
                                {/* 优先展示原播客例句（若有） */}
                                {item.contextSentence && (
                                  <div className="relative bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 p-5 rounded-2xl ring-1 ring-primary/20 shadow-sm transition-all duration-300 hover:shadow-md hover:ring-primary/40 hover:from-primary/10 hover:to-secondary/10">
                                    <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-white text-[10px] font-bold uppercase rounded-bl-xl rounded-tr-2xl shadow-sm">
                                      原声出处
                                    </div>
                                    <div className="text-base font-medium text-base-content mb-3 pr-16 leading-relaxed">
                                      {renderContext(
                                        item.contextSentence,
                                        item.word,
                                      )}
                                    </div>
                                    {item.translation && (
                                      <div className="text-sm text-base-content/70 mb-4">
                                        {item.translation}
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2 text-xs font-medium text-base-content/50 bg-white/50 dark:bg-ink-900/50 px-2 py-1 rounded-md">
                                        <PlayCircle
                                          size={12}
                                          className="text-primary"
                                        />
                                        <span className="truncate max-w-[150px] sm:max-w-[200px]">
                                          {item.episodeTitle}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={(e) =>
                                            playContextAudio(
                                              e,
                                              item.contextSentence,
                                            )
                                          }
                                          className={`p-2.5 rounded-full transition-all shrink-0 shadow-sm ${
                                            playingText === item.contextSentence
                                              ? "text-primary bg-primary/10 animate-pulse"
                                              : "text-primary/70 hover:text-primary hover:bg-primary/10 bg-white dark:bg-ink-800"
                                          }`}
                                          title="AI 朗读句子"
                                        >
                                          <Volume2 size={18} />
                                        </button>
                                        {item.episodeid && (
                                          <button
                                            onClick={() => {
                                              const eid = item.episodeid;
                                              if (!eid) return;
                                              void playOriginal({
                                                key: `${eid}:${item.word}`,
                                                episodeid: eid,
                                                timestamp: item.timestamp,
                                                contextSentence:
                                                  item.contextSentence,
                                              });
                                            }}
                                            disabled={
                                              originalLoadingKey ===
                                              `${item.episodeid}:${item.word}`
                                            }
                                            className={`p-2.5 rounded-full transition-all shrink-0 shadow-sm ${
                                              originalPlayingKey ===
                                                `${item.episodeid}:${item.word}` ||
                                              originalLoadingKey ===
                                                `${item.episodeid}:${item.word}`
                                                ? "text-primary bg-primary/10 animate-pulse"
                                                : "text-primary/70 hover:text-primary hover:bg-primary/10 bg-white dark:bg-ink-800"
                                            }`}
                                            title="播放剧集原声"
                                          >
                                            {originalLoadingKey ===
                                            `${item.episodeid}:${item.word}` ? (
                                              <span className="loading loading-spinner loading-xs" />
                                            ) : (
                                              <Podcast size={18} />
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* 字典例句 */}
                                {item.dictData?.examples?.map((ex, idx) => (
                                  <div
                                    key={idx}
                                    className="group bg-white/80 dark:bg-ink-800/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm ring-1 ring-base-200 dark:ring-base-content/5 transition-all duration-300 hover:shadow-md hover:ring-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 cursor-default"
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                        <div className="text-sm text-base-content font-medium mb-1.5 leading-relaxed">
                                          {renderContext(ex.en, item.word)}
                                        </div>
                                        <p className="text-sm text-base-content/60">
                                          {ex.cn}
                                        </p>
                                        {ex.context && (
                                          <span className="inline-block mt-2.5 px-2.5 py-1 bg-ink-100 dark:bg-ink-900 text-[10px] font-bold text-base-content/60 uppercase rounded-md tracking-wider">
                                            场景: {ex.context}
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        onClick={(e) =>
                                          playContextAudio(e, ex.en)
                                        }
                                        className={`p-2 rounded-full transition-all shrink-0 ${
                                          playingText === ex.en
                                            ? "text-primary bg-primary/10 animate-pulse"
                                            : "text-base-content/30 group-hover:text-primary group-hover:bg-primary/5 bg-ink-50 dark:bg-ink-900"
                                        }`}
                                      >
                                        <Volume2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>
                          </div>

                          {/* 右栏：词源、词形、短语 */}
                          <div className="lg:col-span-5 space-y-8">
                            {/* 词形变化 Inflections */}
                            {item.dictData?.inflections &&
                              Object.values(item.dictData.inflections).some(
                                (v) => v !== null,
                              ) && (
                                <section>
                                  <h4 className="flex items-center text-sm font-extrabold text-base-content/80 mb-4 tracking-wide">
                                    <Activity
                                      size={16}
                                      className="mr-2 text-info"
                                    />
                                    词形变化
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {item.dictData.inflections.past_tense && (
                                      <div className="px-3 py-1.5 bg-white dark:bg-ink-800 rounded-lg ring-1 ring-base-200 dark:ring-base-content/10 shadow-sm flex flex-col">
                                        <span className="text-[9px] uppercase font-bold text-base-content/40 mb-0.5">
                                          过去式
                                        </span>
                                        <span className="text-sm font-medium text-base-content">
                                          {item.dictData.inflections.past_tense}
                                        </span>
                                      </div>
                                    )}
                                    {item.dictData.inflections
                                      .present_participle && (
                                      <div className="px-3 py-1.5 bg-white dark:bg-ink-800 rounded-lg ring-1 ring-base-200 dark:ring-base-content/10 shadow-sm flex flex-col">
                                        <span className="text-[9px] uppercase font-bold text-base-content/40 mb-0.5">
                                          现在分词
                                        </span>
                                        <span className="text-sm font-medium text-base-content">
                                          {
                                            item.dictData.inflections
                                              .present_participle
                                          }
                                        </span>
                                      </div>
                                    )}
                                    {item.dictData.inflections
                                      .third_person_singular && (
                                      <div className="px-3 py-1.5 bg-white dark:bg-ink-800 rounded-lg ring-1 ring-base-200 dark:ring-base-content/10 shadow-sm flex flex-col">
                                        <span className="text-[9px] uppercase font-bold text-base-content/40 mb-0.5">
                                          第三人称单数
                                        </span>
                                        <span className="text-sm font-medium text-base-content">
                                          {
                                            item.dictData.inflections
                                              .third_person_singular
                                          }
                                        </span>
                                      </div>
                                    )}
                                    {item.dictData.inflections.plural && (
                                      <div className="px-3 py-1.5 bg-white dark:bg-ink-800 rounded-lg ring-1 ring-base-200 dark:ring-base-content/10 shadow-sm flex flex-col">
                                        <span className="text-[9px] uppercase font-bold text-base-content/40 mb-0.5">
                                          复数
                                        </span>
                                        <span className="text-sm font-medium text-base-content">
                                          {item.dictData.inflections.plural}
                                        </span>
                                      </div>
                                    )}
                                    {item.dictData.inflections
                                      .adjective_form && (
                                      <div className="px-3 py-1.5 bg-white dark:bg-ink-800 rounded-lg ring-1 ring-base-200 dark:ring-base-content/10 shadow-sm flex flex-col">
                                        <span className="text-[9px] uppercase font-bold text-base-content/40 mb-0.5">
                                          形容词
                                        </span>
                                        <span className="text-sm font-medium text-base-content">
                                          {
                                            item.dictData.inflections
                                              .adjective_form
                                          }
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </section>
                              )}

                            {/* 词源与记忆 Etymology */}
                            {item.dictData?.etymology &&
                              (item.dictData.etymology.breakdown ||
                                item.dictData.etymology.mnemonic ||
                                item.dictData.etymology.root) && (
                                <section>
                                  <h4 className="flex items-center text-sm font-extrabold text-base-content/80 mb-4 tracking-wide">
                                    <History
                                      size={16}
                                      className="mr-2 text-warning"
                                    />
                                    词源与记忆
                                  </h4>
                                  <div className="bg-white/80 dark:bg-ink-800/80 backdrop-blur-sm p-5 rounded-2xl shadow-sm ring-1 ring-base-200 dark:ring-base-content/5 space-y-4">
                                    {/* 词根词缀分解 */}
                                    {(item.dictData.etymology.prefix ||
                                      item.dictData.etymology.root ||
                                      item.dictData.etymology.suffix) && (
                                      <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-base-200/50">
                                        {item.dictData.etymology.prefix && (
                                          <div className="px-2.5 py-1 bg-warning/10 text-warning-700 dark:text-warning-300 rounded-md text-xs font-medium border border-warning/20">
                                            <span className="font-bold opacity-60 mr-1">
                                              前缀
                                            </span>
                                            {item.dictData.etymology.prefix}
                                          </div>
                                        )}
                                        {item.dictData.etymology.root && (
                                          <div className="px-2.5 py-1 bg-error/10 text-error-700 dark:text-error-300 rounded-md text-xs font-medium border border-error/20">
                                            <span className="font-bold opacity-60 mr-1">
                                              词根
                                            </span>
                                            {item.dictData.etymology.root}
                                          </div>
                                        )}
                                        {item.dictData.etymology.suffix && (
                                          <div className="px-2.5 py-1 bg-success/10 text-success-700 dark:text-success-300 rounded-md text-xs font-medium border border-success/20">
                                            <span className="font-bold opacity-60 mr-1">
                                              后缀
                                            </span>
                                            {item.dictData.etymology.suffix}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {item.dictData.etymology.mnemonic && (
                                      <div>
                                        <div className="text-[10px] font-bold text-warning uppercase tracking-widest mb-1">
                                          Mnemonic 记忆法
                                        </div>
                                        <p className="text-sm font-medium text-base-content/90 leading-relaxed">
                                          {item.dictData.etymology.mnemonic}
                                        </p>
                                      </div>
                                    )}
                                    {item.dictData.etymology.breakdown && (
                                      <div className="pt-2">
                                        <div className="text-[10px] font-bold text-base-content/40 uppercase tracking-widest mb-1">
                                          Breakdown 溯源
                                        </div>
                                        <p className="text-xs text-base-content/60 leading-relaxed">
                                          {item.dictData.etymology.breakdown}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </section>
                              )}

                            {/* 短语与搭配 Phrases */}
                            {item.dictData?.phrases_and_collocations &&
                              item.dictData.phrases_and_collocations.length >
                                0 && (
                                <section>
                                  <h4 className="flex items-center text-sm font-extrabold text-base-content/80 mb-4 tracking-wide">
                                    <Tags
                                      size={16}
                                      className="mr-2 text-accent"
                                    />
                                    短语搭配
                                  </h4>
                                  <div className="bg-white/80 dark:bg-ink-800/80 backdrop-blur-sm p-1 rounded-2xl shadow-sm ring-1 ring-base-200 dark:ring-base-content/5">
                                    {item.dictData.phrases_and_collocations.map(
                                      (phrase, idx) => (
                                        <div
                                          key={idx}
                                          className="flex flex-col sm:flex-row sm:justify-between sm:items-center px-4 py-3 border-b border-base-200/40 last:border-0 hover:bg-ink-50 dark:hover:bg-ink-900/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                                        >
                                          <span className="font-bold text-sm text-base-content mb-1 sm:mb-0">
                                            {phrase.phrase}
                                          </span>
                                          <span className="text-sm text-base-content/60 sm:text-right">
                                            {phrase.meaning_cn}
                                          </span>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </section>
                              )}

                            {/* 同反义词 Synonyms & Antonyms */}
                            {(item.dictData?.synonyms?.length ||
                              item.dictData?.antonyms?.length) && (
                              <section>
                                <h4 className="flex items-center text-sm font-extrabold text-base-content/80 mb-4 tracking-wide">
                                  <RefreshCcw
                                    size={16}
                                    className="mr-2 text-base-content/50"
                                  />
                                  扩展词汇
                                </h4>
                                <div className="space-y-3">
                                  {item.dictData?.synonyms &&
                                    item.dictData.synonyms.length > 0 && (
                                      <div className="bg-white/80 dark:bg-ink-800/80 p-4 rounded-2xl shadow-sm ring-1 ring-base-200 dark:ring-base-content/5 flex flex-col sm:flex-row gap-2">
                                        <span className="px-2.5 py-1 bg-success/10 text-success-700 dark:text-success-300 rounded-md text-[10px] font-bold uppercase tracking-wider h-fit w-fit">
                                          同义 Synonyms
                                        </span>
                                        <div className="flex flex-wrap gap-1.5 mt-1 sm:mt-0 sm:ml-2">
                                          {item.dictData.synonyms.map(
                                            (syn, i) => (
                                              <span
                                                key={i}
                                                className="text-sm font-medium text-base-content/80 hover:text-primary cursor-pointer transition-colors"
                                              >
                                                {syn}
                                                {i <
                                                item.dictData!.synonyms!
                                                  .length -
                                                  1
                                                  ? ","
                                                  : ""}
                                              </span>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  {item.dictData?.antonyms &&
                                    item.dictData.antonyms.length > 0 && (
                                      <div className="bg-white/80 dark:bg-ink-800/80 p-4 rounded-2xl shadow-sm ring-1 ring-base-200 dark:ring-base-content/5 flex flex-col sm:flex-row gap-2">
                                        <span className="px-2.5 py-1 bg-error/10 text-error-700 dark:text-error-300 rounded-md text-[10px] font-bold uppercase tracking-wider h-fit w-fit">
                                          反义 Antonyms
                                        </span>
                                        <div className="flex flex-wrap gap-1.5 mt-1 sm:mt-0 sm:ml-2">
                                          {item.dictData.antonyms.map(
                                            (ant, i) => (
                                              <span
                                                key={i}
                                                className="text-sm font-medium text-base-content/80 hover:text-primary cursor-pointer transition-colors"
                                              >
                                                {ant}
                                                {i <
                                                item.dictData!.antonyms!
                                                  .length -
                                                  1
                                                  ? ","
                                                  : ""}
                                              </span>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    )}
                                </div>
                              </section>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* --- 旧版降级视图 (Fallback View) --- */
                      <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-5">
                          <div>
                            <h4 className="text-xs font-bold text-base-content/40 uppercase mb-3 tracking-wider">
                              例句
                            </h4>
                            <div className="bg-white dark:bg-ink-900 p-5 rounded-2xl flex flex-col shadow-sm ring-1 ring-base-200 dark:ring-base-content/10">
                              <div className="text-base font-medium leading-relaxed">
                                {renderContext(item.contextSentence, item.word)}
                              </div>
                              {item.contextSentence && (
                                <div className="mt-3 flex justify-end">
                                  <button
                                    onClick={(e) =>
                                      playContextAudio(e, item.contextSentence)
                                    }
                                    className={`p-2 rounded-full transition-all ${
                                      playingText === item.contextSentence
                                        ? "text-primary bg-primary/20 animate-pulse"
                                        : "text-base-content/40 hover:text-primary bg-ink-50 dark:bg-ink-800"
                                    }`}
                                    title="朗读例句"
                                  >
                                    <Volume2 size={18} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-base-content/40 uppercase mb-2 tracking-wider">
                              中文
                            </h4>
                            <p className="text-base font-medium text-base-content/80">
                              {item.translation || "暂无翻译"}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-5 md:border-l border-base-200/50 md:pl-6">
                          <div>
                            <h4 className="text-xs font-bold text-base-content/40 uppercase mb-3 tracking-wider">
                              来源
                            </h4>
                            <div className="flex items-center space-x-3 text-sm text-base-content/80 bg-white dark:bg-ink-900 p-3 rounded-xl shadow-sm ring-1 ring-base-200 dark:ring-base-content/10">
                              <PlayCircle
                                size={18}
                                className="text-primary shrink-0"
                              />
                              <span className="font-medium truncate">
                                {item.episodeTitle}
                              </span>
                            </div>
                            {item.timestamp && (
                              <div className="mt-2 ml-1 text-xs font-medium text-base-content/40">
                                时间点 {Math.floor(item.timestamp / 60)}:
                                {(item.timestamp % 60)
                                  .toString()
                                  .padStart(2, "0")}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 底部操作区 (所有视图共享) */}
                    <div className="bg-white/50 dark:bg-ink-900/50 p-4 sm:px-6 border-t border-base-200/50 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex space-x-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStatus(item.vocabularyid, item.status);
                          }}
                          className={`group/btn flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                            item.status === "MASTERED"
                              ? "bg-ink-100 dark:bg-ink-800 text-base-content/70 hover:bg-ink-200 dark:hover:bg-ink-700"
                              : "bg-gradient-to-r from-success to-emerald-500 text-white shadow-md shadow-success/20 hover:shadow-lg hover:shadow-success/30 hover:-translate-y-0.5"
                          }`}
                        >
                          {item.status === "MASTERED" ? (
                            <>
                              <RefreshCcw
                                size={16}
                                className="group-hover/btn:-rotate-90 transition-transform duration-500"
                              />
                              <span>重新学习</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle
                                size={16}
                                className="group-hover/btn:scale-110 transition-transform"
                              />
                              <span>标记为已掌握</span>
                            </>
                          )}
                        </button>
                        {item.status === "MASTERED" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(item.vocabularyid);
                            }}
                            className="group/btn flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                            title="彻底删除该生词记录"
                          >
                            <Trash2
                              size={16}
                              className="group-hover/btn:scale-110 transition-transform"
                            />
                            <span className="inline">彻底删除</span>
                          </button>
                        )}
                      </div>
                      {item.webUrl && (
                        <a
                          href={item.webUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-5 py-2.5 bg-white dark:bg-ink-800 rounded-xl text-sm font-bold text-base-content/70 hover:text-primary shadow-sm ring-1 ring-base-200 dark:ring-base-content/10 hover:shadow-md transition-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          查看网络词典
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredList.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center text-base-content/40 bg-white/40 dark:bg-ink-900/40 rounded-2xl border border-dashed border-base-200">
            <div className="bg-ink-100 dark:bg-ink-800 p-4 rounded-full mb-4">
              <Filter size={32} className="opacity-40" />
            </div>
            <p className="text-lg font-medium">
              {hookOptions.filterStatus === "MASTERED"
                ? "空空如也，暂无已掌握的单词"
                : "未找到匹配的生词"}
            </p>
            <p className="text-sm mt-2 opacity-60">
              {hookOptions.filterStatus === "MASTERED"
                ? "继续学习，将生词转化为你的永久财富吧！"
                : "调整搜索词或切换状态试试"}
            </p>
          </div>
        )}
      </div>

      {/* 删除确认弹窗 (daisyUI) */}
      <dialog
        className={`modal modal-bottom sm:modal-middle ${
          deletingId !== null ? "modal-open" : ""
        }`}
      >
        <div className="modal-box">
          <h3 className="font-bold text-lg text-red-600 dark:text-red-400 flex items-center gap-2">
            <Trash2 size={20} />
            确认彻底删除
          </h3>
          <p className="py-4 text-base-content/80">
            确定要彻底删除该生词吗？此操作不可恢复。
          </p>
          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={() => setDeletingId(null)}
            >
              取消
            </button>
            <button
              className="btn btn-error text-white"
              onClick={() => {
                if (deletingId !== null) {
                  deleteVocabulary(deletingId);
                  setDeletingId(null);
                }
              }}
            >
              确定删除
            </button>
          </div>
        </div>
        <form
          method="dialog"
          className="modal-backdrop"
          onClick={() => setDeletingId(null)}
        >
          <button type="button">close</button>
        </form>
      </dialog>
    </>
  );
}
