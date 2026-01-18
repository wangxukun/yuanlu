"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  History,
  PlayCircle,
  CheckCircle2,
  Trash2,
  Clock,
  Calendar,
  RotateCcw,
  Search,
  ChevronRight,
  AlertTriangle,
  X,
} from "lucide-react";
import { ListeningHistoryItem } from "@/core/listening-history/dto";
import {
  removeHistoryAction,
  clearHistoryAction,
} from "@/lib/actions/history-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ListeningHistoryPageProps {
  history: ListeningHistoryItem[];
}

type ConfirmState = {
  isOpen: boolean;
  type: "delete-one" | "clear-all";
  title: string;
  description: string;
  targetId?: number;
};

const ListeningHistoryPage: React.FC<ListeningHistoryPageProps> = ({
  history: initialHistory,
}) => {
  const router = useRouter();
  const [history, setHistory] =
    useState<ListeningHistoryItem[]>(initialHistory);
  const [filter, setFilter] = useState<"all" | "finished" | "in-progress">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    type: "delete-one",
    title: "",
    description: "",
  });

  const handlePlayEpisode = (episodeId: string) => {
    router.push(`/episode/${episodeId}`);
  };

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        item.episode.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.episode.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "finished"
            ? item.isFinished
            : !item.isFinished;

      return matchesSearch && matchesFilter;
    });
  }, [history, filter, searchQuery]);

  const groupedHistory = useMemo(() => {
    const groups: { [key: string]: ListeningHistoryItem[] } = {};
    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const yesterday = today - 86400000;

    filteredHistory.forEach((item) => {
      const itemDate = new Date(item.listenAt);
      const itemTime = new Date(
        itemDate.getFullYear(),
        itemDate.getMonth(),
        itemDate.getDate(),
      ).getTime();

      let label = "更早";
      if (itemTime === today) label = "今天";
      else if (itemTime === yesterday) label = "昨天";
      else
        label = itemDate.toLocaleDateString("zh-CN", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });

      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });

    return groups;
  }, [filteredHistory]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    // [修改] 增加 Math.floor 去除秒数的小数部分
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const requestDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setConfirmState({
      isOpen: true,
      type: "delete-one",
      targetId: id,
      title: "删除记录",
      description: "确定要删除这条收听记录吗？删除后无法恢复。",
    });
  };

  const requestClearAll = () => {
    setConfirmState({
      isOpen: true,
      type: "clear-all",
      title: "清空历史",
      description: "确定要清空所有收听历史吗？此操作极其危险且无法撤销。",
    });
  };

  const handleConfirmAction = async () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));

    if (confirmState.type === "delete-one" && confirmState.targetId) {
      const id = confirmState.targetId;
      const previousHistory = history;
      setHistory((prev) => prev.filter((h) => h.historyid !== id));

      startTransition(async () => {
        const res = await removeHistoryAction(id);
        if (!res.success) {
          setHistory(previousHistory);
          toast.error("删除失败");
        } else {
          toast.success("记录已删除");
        }
      });
    } else if (confirmState.type === "clear-all") {
      const previousHistory = history;
      setHistory([]);

      startTransition(async () => {
        const res = await clearHistoryAction();
        if (!res.success) {
          setHistory(previousHistory);
          toast.error("清空失败");
        } else {
          toast.success("历史记录已清空");
        }
      });
    }
  };

  const latestUnfinished = history.find((h) => !h.isFinished);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 xl:py-8 space-y-6 xl:space-y-8 animate-in fade-in duration-500 font-sans relative">
      {/* 页面标题 */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
            <History
              className="mr-3 text-indigo-600 dark:text-indigo-400"
              size={32}
            />
            收听历史
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm xl:text-base">
            继续你的精听之旅，随时回顾学习进度。
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full xl:w-auto">
          <button
            onClick={requestClearAll}
            disabled={isPending || history.length === 0}
            className="flex items-center justify-center w-full xl:w-auto px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} className="mr-2" />
            清空历史
          </button>
        </div>
      </div>

      {/* Hero 区域 */}
      {latestUnfinished && filter !== "finished" && (
        <div className="relative overflow-hidden bg-slate-900 dark:bg-black/40 bg-gradient-to-br from-indigo-600 to-purple-700 dark:border dark:border-slate-800 rounded-3xl p-6 xl:p-8 text-white shadow-xl shadow-slate-200 dark:shadow-none group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
          {/* Mobile: Flex-col (Vertical), Desktop: Flex-row (Horizontal) */}
          <div className="relative z-10 flex flex-col xl:flex-row items-center gap-6 xl:gap-8">
            <div className="relative w-full xl:w-48 aspect-video xl:h-27 flex-shrink-0 shadow-2xl rounded-2xl overflow-hidden bg-slate-800 border border-slate-700">
              <img
                src={latestUnfinished.episode.thumbnailUrl}
                alt={latestUnfinished.episode.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <PlayCircle
                  size={48}
                  className="text-white/80 xl:w-12 xl:h-12 w-16 h-16"
                />
              </div>
            </div>

            <div className="flex-1 space-y-4 text-center xl:text-left w-full">
              <div className="flex justify-center xl:justify-start">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500 text-white uppercase tracking-wider">
                  继续收听
                </span>
              </div>
              <h2 className="text-xl xl:text-2xl font-bold leading-tight text-white line-clamp-2">
                {latestUnfinished.episode.title}
              </h2>
              <p className="text-slate-400 text-sm xl:text-base">
                {latestUnfinished.episode.author} •{" "}
                {latestUnfinished.episode.category}
              </p>

              <div className="space-y-2 max-w-md mx-auto xl:mx-0">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-indigo-300">
                    上次听到 {formatTime(latestUnfinished.progressSeconds)}
                  </span>
                  <span className="text-slate-400">
                    总时长 {latestUnfinished.episode.duration}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        (latestUnfinished.progressSeconds /
                          (latestUnfinished.episode.durationSeconds || 1)) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              <button
                onClick={() => handlePlayEpisode(latestUnfinished.episode.id)}
                className="w-full xl:w-auto bg-white dark:bg-slate-200 text-slate-900 px-8 py-3 rounded-full font-bold hover:bg-indigo-50 dark:hover:bg-slate-100 transition-all flex items-center justify-center mx-auto xl:mx-0 shadow-lg shadow-indigo-900/20 dark:shadow-none"
              >
                <RotateCcw size={18} className="mr-2" />从{" "}
                {formatTime(latestUnfinished.progressSeconds)} 继续
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 筛选栏 - Mobile Layout Redesign */}
      <div className="flex flex-col-reverse xl:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors sticky top-0 xl:static z-20">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full xl:w-auto">
          {/* Mobile: Grid cols 3, Desktop: Flex row */}
          <div className="grid grid-cols-3 xl:flex xl:flex-row w-full gap-1">
            {[
              { key: "all", label: "全部" },
              { key: "in-progress", label: "进行中" },
              { key: "finished", label: "已完成" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() =>
                  setFilter(opt.key as "all" | "in-progress" | "finished")
                }
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  filter === opt.key
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full xl:w-64">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="搜索收听历史..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-slate-200 dark:placeholder-slate-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 列表内容 */}
      <div className="space-y-8 pb-20">
        {Object.keys(groupedHistory).length > 0 ? (
          (
            Object.entries(groupedHistory) as [string, ListeningHistoryItem[]][]
          ).map(([date, items]) => (
            <div key={date} className="space-y-4">
              <div className="flex items-center">
                <Calendar
                  size={16}
                  className="text-slate-400 dark:text-slate-500 mr-2"
                />
                <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {date}
                </h3>
                <div className="ml-4 flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {items.map((item) => (
                  <div
                    key={item.historyid}
                    onClick={() => handlePlayEpisode(item.episode.id)}
                    className="group bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all cursor-pointer flex flex-col xl:flex-row xl:items-center gap-4 relative overflow-hidden"
                  >
                    {/* Cover Image: Full width on mobile, Fixed size on Desktop */}
                    <div className="w-full xl:w-32 aspect-video xl:h-18 rounded-xl overflow-hidden flex-shrink-0 shadow-sm bg-slate-100 dark:bg-slate-800 relative">
                      <img
                        src={item.episode.thumbnailUrl}
                        alt={item.episode.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Mobile Play Overlay */}
                      <div className="xl:hidden absolute inset-0 bg-black/10 flex items-center justify-center">
                        <PlayCircle className="text-white/80 w-10 h-10" />
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0 pr-0 xl:pr-8 w-full">
                      <div className="flex items-center gap-2 mb-2 xl:mb-1">
                        {item.isFinished ? (
                          <span className="flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md uppercase">
                            <CheckCircle2 size={10} className="mr-1" /> 已完成
                          </span>
                        ) : (
                          <span className="flex items-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md uppercase">
                            <Clock size={10} className="mr-1" />{" "}
                            {Math.round(
                              (item.progressSeconds /
                                (item.episode.durationSeconds || 1)) *
                                100,
                            )}
                            %
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          {item.episode.category}
                        </span>
                      </div>
                      <h4 className="text-lg xl:text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {item.episode.title}
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1 xl:mt-0">
                        {item.episode.author}
                      </p>

                      {/* Mobile Only Meta Bar (Below Title/Author) */}
                      <div className="flex xl:hidden items-center justify-between mt-4 pt-3 border-t border-slate-50 dark:border-slate-800/50">
                        <div className="flex items-center text-xs text-slate-400 dark:text-slate-500">
                          <span className="font-medium text-slate-700 dark:text-slate-300 mr-2">
                            {formatTime(item.progressSeconds)}
                          </span>
                          / {item.episode.duration}
                        </div>
                        <button
                          onClick={(e) => requestDelete(e, item.historyid)}
                          className="flex items-center text-xs font-medium text-slate-400 hover:text-red-500 p-1"
                        >
                          <Trash2 size={14} className="mr-1" /> 删除
                        </button>
                      </div>
                    </div>

                    {/* Desktop Only Stats (Right Side) */}
                    <div className="hidden xl:flex flex-col items-end text-right min-w-[120px]">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
                        {item.isFinished
                          ? item.episode.duration
                          : `${formatTime(item.progressSeconds)} / ${
                              item.episode.duration
                            }`}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-medium mt-1">
                        {new Date(item.listenAt).toLocaleTimeString("zh-CN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Desktop Only Actions (Right Chevron/Delete) */}
                    <div className="hidden xl:flex items-center gap-1">
                      <button
                        onClick={(e) => requestDelete(e, item.historyid)}
                        className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                        title="删除记录"
                      >
                        <Trash2 size={18} />
                      </button>
                      <ChevronRight
                        className="text-slate-300 dark:text-slate-600"
                        size={20}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 border-dashed transition-colors">
            <History
              size={48}
              className="mx-auto text-slate-200 dark:text-slate-700 mb-4"
            />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200">
              暂无历史记录
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              开始学习后，你的收听足迹将显示在这里。
            </p>
          </div>
        )}
      </div>

      {/* --- Modal 确认弹窗 --- */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() =>
              setConfirmState((prev) => ({ ...prev, isOpen: false }))
            }
          ></div>

          {/* 弹窗内容 */}
          <div className="relative bg-white dark:bg-slate-900 shadow-2xl rounded-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200 z-10 border dark:border-slate-800">
            <button
              className="absolute right-3 top-3 p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              onClick={() =>
                setConfirmState((prev) => ({ ...prev, isOpen: false }))
              }
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                <AlertTriangle size={24} />
              </div>

              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2">
                {confirmState.title}
              </h3>

              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 px-2">
                {confirmState.description}
              </p>

              <div className="flex gap-3 w-full">
                <button
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  onClick={() =>
                    setConfirmState((prev) => ({ ...prev, isOpen: false }))
                  }
                >
                  取消
                </button>
                <button
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-200 dark:shadow-none"
                  onClick={handleConfirmAction}
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListeningHistoryPage;
