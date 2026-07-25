import {
  Volume2,
  ChevronDown,
  ChevronUp,
  Clock,
  PlayCircle,
  Filter,
} from "lucide-react";
import {
  isDue,
  formatDate,
  UseVocabularyNotebookReturn,
} from "../hooks/useVocabularyNotebook";
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
  } = hookOptions;

  return (
    <div className="grid grid-cols-1 gap-4">
      {filteredList.map((item: VocabularyItem) => {
        const isExpanded = expandedId === item.vocabularyid;
        const due = isDue(item.nextReviewAt);

        return (
          <div
            key={item.vocabularyid}
            onClick={() => setExpandedId(isExpanded ? null : item.vocabularyid)}
            className={`bg-white dark:bg-slate-900 rounded-lg transition-all cursor-pointer overflow-hidden ${
              isExpanded
                ? "ring-1 ring-primary/20"
                : "hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {/* 卡片内容区: Mobile为垂直布局，Desktop为水平布局 */}
            <div className="p-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 xl:gap-0">
              {/* 左侧：单词与定义 */}
              <div className="flex flex-row items-start space-x-4 w-full xl:w-auto">
                <div
                  className={`hidden xl:block w-2 h-2 rounded-full mt-2.5 xl:mt-0 shrink-0 ${
                    due
                      ? "bg-warning animate-pulse"
                      : "bg-slate-200 dark:bg-slate-700"
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
                          due ? "bg-warning" : "bg-slate-200 dark:bg-slate-700"
                        }`}
                      />
                    </div>
                    {item.speakUrl && (
                      <button
                        onClick={(e) => playAudio(e, item.speakUrl)}
                        className="p-1.5 text-base-content/40 hover:text-primary rounded-full bg-slate-50 dark:bg-slate-800 xl:bg-transparent transition-colors shrink-0"
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
                          : "bg-slate-100 dark:bg-slate-800"
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
                className="bg-indigo-50/30 dark:bg-slate-800/40 p-4 xl:p-6 animate-in slide-in-from-top-2 duration-200 cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-base-content/40 uppercase mb-2">
                        例句
                      </h4>
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg flex flex-col">
                        {renderContext(item.contextSentence, item.word)}
                        {item.contextSentence && (
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={(e) =>
                                playContextAudio(e, item.contextSentence)
                              }
                              className={`p-1.5 rounded-full transition-all ${
                                playingText === item.contextSentence
                                  ? "text-primary bg-primary/20 animate-pulse"
                                  : "text-base-content/40 hover:text-primary bg-slate-50 dark:bg-slate-800"
                              }`}
                              title="朗读例句"
                            >
                              {playingText === item.contextSentence ? (
                                <Volume2 size={16} className="animate-bounce" />
                              ) : (
                                <Volume2 size={16} />
                              )}
                            </button>
                          </div>
                        )}
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
                            className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 rounded-lg text-sm text-base-content/80 hover:text-primary transition-colors text-center"
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
  );
}
