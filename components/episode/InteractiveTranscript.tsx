"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  memo,
  useCallback,
} from "react";
import { usePlayerStore } from "@/store/player-store";
import { useSession } from "next-auth/react";
import {
  PlayCircleIcon,
  SpeakerWaveIcon,
  LanguageIcon,
  BookOpenIcon,
  XMarkIcon,
  PauseCircleIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { Episode } from "@/core/episode/episode.entity";
import { toast } from "sonner";
import clsx from "clsx";
import { parseTimeStr } from "@/lib/tools";

// --- 类型定义 ---
interface MergedSubtitleItem {
  id: number;
  startTime: string;
  endTime: string;
  textEn: string;
  textZh: string;
}

interface InteractiveTranscriptProps {
  subtitles: MergedSubtitleItem[];
  episode: Episode;
}

interface ProcessedSubtitle extends MergedSubtitleItem {
  start: number;
  end: number;
}

// 划词菜单状态
interface SelectionMenuState {
  visible: boolean;
  x: number;
  y: number;
  text: string;
  contextEn: string;
  contextZh: string;
}

// --- 独立子组件：字幕行 ---
const SubtitleItem = memo(function SubtitleItem({
  sub,
  isActive,
  isPlaying,
  showTranslation,
  onJump,
  onWordClick,
}: {
  sub: ProcessedSubtitle;
  isActive: boolean;
  isPlaying: boolean;
  showTranslation: boolean;
  onJump: (time: number) => void;
  onWordClick: (word: string, contextEn: string, contextZh: string) => void;
}) {
  return (
    <div
      id={`subtitle-${sub.id}`} // 关键：ID 用于反向查找数据
      data-active={isActive}
      className={clsx(
        "group relative rounded-xl p-4 sm:p-6 transition-all duration-200 border-l-4",
        isActive
          ? "bg-orange-50 bg-opacity-80 border-orange-400 shadow-sm"
          : "bg-transparent border-transparent hover:bg-base-200 hover:bg-opacity-30",
      )}
    >
      <div className="flex gap-4 sm:gap-6 items-start">
        <button
          onClick={() => onJump(sub.start)}
          className={clsx(
            "mt-1.5 flex-shrink-0 transition-all duration-200 transform",
            isActive
              ? "text-orange-500 scale-110 opacity-100"
              : "text-base-content text-opacity-20 opacity-0 group-hover:opacity-100 hover:text-primary hover:scale-110",
          )}
          aria-label="Play segment"
        >
          {isActive && isPlaying ? (
            <div className="relative w-6 h-6 flex items-center justify-center">
              <span className="loading loading-bars loading-xs"></span>
            </div>
          ) : (
            <PlayCircleIcon className="w-7 h-7" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={clsx(
              "font-serif text-lg sm:text-xl leading-8 sm:leading-9 tracking-wide transition-colors",
              isActive ? "text-slate-900 font-medium" : "text-slate-700",
            )}
          >
            {sub.textEn
              .trim()
              .split(" ")
              .map((word, i) => (
                <React.Fragment key={i}>
                  <span
                    onClick={(e) => {
                      const selection = window.getSelection();
                      // 移动端兼容：如果正在选中文本，不触发单词点击
                      if (selection && !selection.isCollapsed) {
                        return;
                      }
                      e.stopPropagation();
                      onWordClick(word, sub.textEn, sub.textZh);
                    }}
                    className="cursor-pointer rounded transition-colors px-0.5 -mx-0.5 inline-block active:scale-95 select-text relative hover:z-10 hover:bg-orange-200 hover:text-orange-700"
                  >
                    {word}
                  </span>{" "}
                </React.Fragment>
              ))}
          </p>

          <div
            className={clsx(
              "overflow-hidden transition-all duration-200 ease-in-out",
              showTranslation
                ? "max-h-40 opacity-100 mt-3"
                : "max-h-0 opacity-0 mt-0",
            )}
          >
            <p
              className={clsx(
                "font-sans text-sm sm:text-base leading-7 tracking-wider",
                isActive ? "text-slate-600 font-medium" : "text-slate-400",
              )}
            >
              {sub.textZh.trim()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function InteractiveTranscript({
  subtitles,
  episode,
}: InteractiveTranscriptProps) {
  // 1. Auth State
  const { data: session } = useSession();

  // 2. Store State
  const {
    currentTime,
    setCurrentTime,
    audioRef,
    pause,
    play,
    isPlaying,
    currentEpisode,
    setCurrentEpisode,
    setCurrentAudioUrl,
  } = usePlayerStore();

  const isPlayingThisEpisode = currentEpisode?.episodeid === episode.episodeid;

  // 3. Local State
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [showTranslation, setShowTranslation] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  // 划词菜单 State
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenuState>({
    visible: false,
    x: 0,
    y: 0,
    text: "",
    contextEn: "",
    contextZh: "",
  });

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const activeIndexRef = useRef<number>(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modal State
  const [selectedWord, setSelectedWord] = useState<string>("");
  const [selectedContext, setSelectedContext] = useState<string>("");
  const [selectedTranslation, setSelectedTranslation] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [definition, setDefinition] = useState("");
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false);
  const [wordDetails, setWordDetails] = useState<{
    speakUrl?: string;
    dictUrl?: string;
    webUrl?: string;
    mobileUrl?: string;
  }>({});

  // 4. Process Subtitles
  const processedSubtitles = useMemo(() => {
    if (!Array.isArray(subtitles)) return [];
    return subtitles.map((item) => ({
      ...item,
      start: parseTimeStr(item.startTime),
      end: parseTimeStr(item.endTime),
    }));
  }, [subtitles]);

  // 5. Sync Highlight Logic (Keep Existing)
  useEffect(() => {
    if (!isPlayingThisEpisode || !isPlaying || !audioRef) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    let lastFoundIndex =
      activeIndexRef.current >= 0 ? activeIndexRef.current : 0;

    const loop = () => {
      const t = audioRef.currentTime;
      let foundIndex = -1;

      const currentSub = processedSubtitles[lastFoundIndex];
      if (currentSub && t >= currentSub.start && t <= currentSub.end) {
        foundIndex = lastFoundIndex;
      } else {
        if (currentSub && t > currentSub.end) {
          for (let i = lastFoundIndex + 1; i < processedSubtitles.length; i++) {
            if (
              t >= processedSubtitles[i].start &&
              t <= processedSubtitles[i].end
            ) {
              foundIndex = i;
              lastFoundIndex = i;
              break;
            }
            if (t < processedSubtitles[i].start) break;
          }
        } else {
          foundIndex = processedSubtitles.findIndex(
            (sub) => t >= sub.start && t <= sub.end,
          );
          if (foundIndex !== -1) lastFoundIndex = foundIndex;
        }
      }

      if (foundIndex !== activeIndexRef.current) {
        setActiveIndex(foundIndex);
        activeIndexRef.current = foundIndex;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying, isPlayingThisEpisode, audioRef, processedSubtitles]);

  useEffect(() => {
    if (isPlayingThisEpisode && !isPlaying) {
      const index = processedSubtitles.findIndex(
        (sub) => currentTime >= sub.start && currentTime <= sub.end,
      );
      if (index !== activeIndex) {
        setActiveIndex(index);
        activeIndexRef.current = index;
      }
    }
    if (!isPlayingThisEpisode && activeIndex !== -1) {
      setActiveIndex(-1);
      activeIndexRef.current = -1;
    }
  }, [
    currentTime,
    isPlaying,
    isPlayingThisEpisode,
    processedSubtitles,
    activeIndex,
  ]);

  const getScrollParent = (node: HTMLElement): HTMLElement | Window => {
    let parent = node.parentElement;
    while (parent) {
      const { overflowY } = window.getComputedStyle(parent);
      if (overflowY.includes("auto") || overflowY.includes("scroll")) {
        return parent;
      }
      parent = parent.parentElement;
    }
    return window;
  };

  useEffect(() => {
    if (!autoScroll || activeIndex === -1) return;

    const activeEl = document.getElementById(
      `subtitle-${processedSubtitles[activeIndex]?.id}`,
    );

    if (activeEl) {
      const container = getScrollParent(activeEl);
      if (container === window) return;
      const scrollContainer = container as HTMLElement;
      const containerRect = scrollContainer.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();

      const safetyTop = containerRect.top + 120;
      const safetyBottom = containerRect.bottom - containerRect.height * 0.35;

      if (activeRect.top < safetyTop || activeRect.bottom > safetyBottom) {
        const targetScreenPos = containerRect.height * 0.3;
        const offset = activeRect.top - containerRect.top - targetScreenPos;

        scrollContainer.scrollTo({
          top: scrollContainer.scrollTop + offset,
          behavior: "smooth",
        });
      }
    }
  }, [activeIndex, autoScroll, processedSubtitles]);

  // --- 移动端兼容的核心：全局 Selection 监听 ---
  useEffect(() => {
    const handleSelectionChange = () => {
      // 防抖处理：等待用户手指离开或停止拖动 handles
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }

      selectionTimeoutRef.current = setTimeout(() => {
        const selection = window.getSelection();

        // 1. 基础校验：无选区或选区收起时，隐藏菜单
        if (!selection || selection.isCollapsed || !selection.rangeCount) {
          setSelectionMenu((prev) =>
            prev.visible ? { ...prev, visible: false } : prev,
          );
          return;
        }

        const text = selection.toString().trim();
        if (!text) return;

        // 2. 校验选区是否在当前组件容器内
        // 使用 anchorNode (开始点) 来判断
        const anchorNode = selection.anchorNode;
        if (!anchorNode || !containerRef.current?.contains(anchorNode)) {
          return;
        }

        // 3. 反向查找：通过 DOM 结构找到对应的字幕数据
        // 我们在 SubtitleItem 上设置了 id="subtitle-{id}"
        const parentElement =
          anchorNode.nodeType === Node.TEXT_NODE
            ? anchorNode.parentElement
            : (anchorNode as HTMLElement);

        const subtitleRow = parentElement?.closest('[id^="subtitle-"]');

        if (subtitleRow) {
          const idStr = subtitleRow.id.split("-")[1];
          const subId = parseInt(idStr, 10);
          const subData = processedSubtitles.find((s) => s.id === subId);

          if (subData) {
            // 4. 计算菜单位置
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // 移动端优化：如果 rect.width 为 0 (异常情况)，则不显示
            if (rect.width === 0 && rect.height === 0) return;

            setSelectionMenu({
              visible: true,
              x: rect.left + rect.width / 2, // 水平居中
              y: rect.top, // 显示在选区顶部
              text: text,
              contextEn: subData.textEn,
              contextZh: subData.textZh,
            });
          }
        }
      }, 300); // 延迟 300ms，给予移动端 selection handles 动画时间
    };

    document.addEventListener("selectionchange", handleSelectionChange);

    // 监听滚动事件，滚动时隐藏菜单，避免位置错乱
    document.addEventListener(
      "scroll",
      () => {
        setSelectionMenu((prev) =>
          prev.visible ? { ...prev, visible: false } : prev,
        );
      },
      { capture: true, passive: true },
    );

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      if (selectionTimeoutRef.current)
        clearTimeout(selectionTimeoutRef.current);
    };
  }, [processedSubtitles]);

  // --- 交互逻辑 ---

  const handleJump = useCallback(
    (startTime: number) => {
      setSelectionMenu((prev) => ({ ...prev, visible: false }));

      if (isPlayingThisEpisode && audioRef) {
        audioRef.currentTime = startTime;
        setCurrentTime(startTime);
        play();
      } else {
        setCurrentEpisode(episode);
        setCurrentAudioUrl(episode.audioUrl);
      }
    },
    [
      isPlayingThisEpisode,
      audioRef,
      setCurrentTime,
      play,
      setCurrentEpisode,
      setCurrentAudioUrl,
      episode,
    ],
  );

  const handleWordClick = useCallback(
    async (word: string, contextEn: string, contextZh: string) => {
      setSelectionMenu((prev) => ({ ...prev, visible: false }));

      if (isPlayingThisEpisode && isPlaying && pause) pause();

      const cleanWord = word.replace(/[.,!?;:"()]/g, "").trim();
      if (!cleanWord) return;

      setSelectedWord(cleanWord);
      setSelectedContext(contextEn);
      setSelectedTranslation(contextZh);
      setDefinition("");
      setWordDetails({});
      setIsModalOpen(true);
      setIsLoadingDefinition(true);

      try {
        const res = await fetch("/api/dictionary/youdao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word: cleanWord }),
        });
        if (res.ok) {
          const data = await res.json();
          setDefinition(data.definition);
          setWordDetails(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingDefinition(false);
      }
    },
    [isPlayingThisEpisode, isPlaying, pause],
  );

  // 全局点击监听 (辅助关闭)
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      // 只有当有菜单且选区为空时才关闭，否则 selectionchange 会负责处理
      // 实际上直接关闭比较安全，因为点击空白处通常意味着取消选择
      const selection = window.getSelection();
      if (selection?.isCollapsed) {
        setSelectionMenu((prev) =>
          prev.visible ? { ...prev, visible: false } : prev,
        );
      }
    };

    window.addEventListener("mousedown", handleGlobalClick);
    window.addEventListener("touchstart", handleGlobalClick);
    return () => {
      window.removeEventListener("mousedown", handleGlobalClick);
      window.removeEventListener("touchstart", handleGlobalClick);
    };
  }, []);

  const handleSaveVocabulary = async () => {
    if (!selectedWord) return;

    if (!session?.user) {
      toast.error("请先登录后再保存生词");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/vocabulary/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: selectedWord,
          definition: definition,
          contextSentence: selectedContext,
          translation: selectedTranslation,
          episodeid: episode.episodeid,
          timestamp:
            isPlayingThisEpisode && audioRef ? audioRef.currentTime : 0,
          speakUrl: wordDetails.speakUrl,
          dictUrl: wordDetails.dictUrl,
          webUrl: wordDetails.webUrl,
          mobileUrl: wordDetails.mobileUrl,
        }),
      });
      if (res.ok) {
        toast.success("已加入生词本");
        setIsModalOpen(false);
      } else {
        toast.error("保存失败");
      }
    } catch (error) {
      console.error(error);
      toast.error("网络错误");
    } finally {
      setIsSaving(false);
    }
  };

  const playWordAudio = () => {
    if (wordDetails.speakUrl) {
      new Audio(wordDetails.speakUrl).play().catch(console.error);
    }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      {/* --- 工具栏 --- */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-base-200 border-opacity-60 sticky top-0 bg-base-100 bg-opacity-95 backdrop-blur z-10 py-2">
        <div className="flex items-center gap-2">
          {isPlayingThisEpisode ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full animate-pulse">
              <SpeakerWaveIcon className="w-3.5 h-3.5" /> 正在精听
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-base-content/40 bg-base-200 px-2 py-1 rounded-full">
              <PauseCircleIcon className="w-3.5 h-3.5" /> 点击段落播放
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={clsx(
              "btn btn-xs sm:btn-sm btn-ghost gap-1.5 transition-colors",
              autoScroll
                ? "text-primary bg-primary/5 "
                : "text-base-content text-opacity-40",
            )}
            title="开启/关闭自动跟随滚动"
          >
            <ArrowsRightLeftIcon
              className={clsx("w-3.5 h-3.5", autoScroll && "rotate-90")}
            />
            <span className="hidden sm:inline">跟随</span>
          </button>

          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className={clsx(
              "btn btn-xs sm:btn-sm btn-ghost gap-1.5 transition-colors",
              showTranslation
                ? "text-primary bg-primary/5"
                : "text-base-content/40",
            )}
          >
            <LanguageIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">译文</span>
          </button>
        </div>
      </div>

      {!session?.user && (
        <div className="mb-6 -mt-2 text-center animate-fade-in-down">
          <p className="text-xs font-medium text-base-content/60 bg-base-200/50 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-base-200 cursor-default hover:bg-base-200 transition-colors">
            <InformationCircleIcon className="w-3.5 h-3.5 text-primary" />
            <span>提示：登录后点击单词可一键加入生词本</span>
          </p>
        </div>
      )}

      {/* --- 字幕内容区 --- */}
      <div className="space-y-6 pb-20" ref={containerRef}>
        {processedSubtitles.map((sub, index) => (
          <SubtitleItem
            key={sub.id || index}
            sub={sub}
            isActive={index === activeIndex}
            isPlaying={isPlaying}
            showTranslation={showTranslation}
            onJump={handleJump}
            onWordClick={handleWordClick}
          />
        ))}
      </div>

      {/* --- 悬浮菜单 (针对移动端优化位置) --- */}
      {selectionMenu.visible && (
        <div
          ref={menuRef}
          // 1. 使用 CSS 变量传递坐标，避免内联样式覆盖 CSS 类
          style={
            {
              "--x": `${selectionMenu.x}px`,
              "--y": `${selectionMenu.y}px`,
            } as React.CSSProperties
          }
          className={clsx(
            // --- 通用样式 ---
            "fixed z-[100] flex justify-center pointer-events-auto",
            // --- 移动端样式 (手机) ---
            // 固定在底部，左右撑开或居中，避开原生系统菜单
            "bottom-6 left-0 right-0 px-4",
            "animate-in slide-in-from-bottom-2 fade-in duration-200", // 底部滑入动画

            // --- 桌面端样式 (平板/PC) ---
            // 恢复跟随选区，位置由 CSS 变量控制
            "md:bottom-auto md:left-[var(--x)] md:top-[var(--y)] md:right-auto md:px-0",
            "md:-translate-x-1/2 md:-translate-y-full md:-mt-3", // 向上偏移，显示在文字上方
            "md:animate-in md:zoom-in-95 md:fade-in md:slide-in-from-bottom-0", // 桌面端缩放动画
          )}
        >
          {/* 菜单容器 */}
          <div className="bg-slate-900/90 backdrop-blur-md text-white rounded-full md:rounded-xl shadow-2xl px-4 py-3 md:py-2 flex items-center gap-3 text-sm border border-slate-700 w-full md:w-auto max-w-sm mx-auto">
            {/* 选中的文本 (移动端显示省略号) */}
            <span className="flex-1 md:flex-none max-w-[150px] md:max-w-[180px] truncate font-serif italic border-r border-slate-600 mr-1 select-none text-slate-300">
              {selectionMenu.text}
            </span>

            {/* 按钮组 */}
            <button
              className="hover:text-primary active:scale-95 transition-all flex items-center gap-1.5 font-bold whitespace-nowrap text-white"
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleWordClick(
                  selectionMenu.text,
                  selectionMenu.contextEn,
                  selectionMenu.contextZh,
                );
                window.getSelection()?.removeAllRanges();
                setSelectionMenu((prev) => ({ ...prev, visible: false }));
              }}
              onClick={() => {
                handleWordClick(
                  selectionMenu.text,
                  selectionMenu.contextEn,
                  selectionMenu.contextZh,
                );
                window.getSelection()?.removeAllRanges();
                setSelectionMenu((prev) => ({ ...prev, visible: false }));
              }}
            >
              <PlusCircleIcon className="w-5 h-5 text-primary" />
              <span>查词/翻译</span>
            </button>
          </div>

          {/* 小箭头 (仅在桌面端显示) */}
          <div className="hidden md:block absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-[40%] rotate-45 w-3 h-3 bg-slate-900/90 border-r border-b border-slate-700"></div>
        </div>
      )}

      {/* --- 生词弹窗 (保持原样) --- */}
      <dialog
        className={clsx(
          "modal modal-bottom sm:modal-middle",
          isModalOpen && "modal-open",
        )}
      >
        <div className="modal-box bg-base-100 sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-0 overflow-hidden border border-base-200">
          <div className="bg-primary/5 px-6 py-4 flex justify-between items-center border-b border-primary/10">
            <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
              <BookOpenIcon className="w-5 h-5" /> 查词助手
            </h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="btn btn-sm btn-circle btn-ghost"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-3">
                <h2 className="text-3xl font-serif font-black text-slate-800 break-all">
                  {selectedWord}
                </h2>
                {wordDetails.speakUrl && (
                  <button
                    onClick={playWordAudio}
                    className="btn btn-circle btn-sm btn-primary btn-outline flex-shrink-0"
                  >
                    <SpeakerWaveIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-base-content/40 uppercase tracking-wider">
                  定义
                </label>
                {isLoadingDefinition && (
                  <span className="loading loading-spinner loading-xs text-primary"></span>
                )}
              </div>
              <textarea
                className="textarea textarea-bordered w-full h-24 bg-base-200/30 text-base leading-relaxed focus:bg-white transition-colors resize-none"
                placeholder="输入释义..."
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
              ></textarea>

              <div className="flex flex-wrap gap-2 pt-1">
                {wordDetails.webUrl && (
                  <a
                    href={wordDetails.webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 btn btn-xs btn-outline btn-accent"
                  >
                    <span>查看详情</span>
                  </a>
                )}
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <p className="text-sm text-slate-700 font-serif italic mb-2">
                “{selectedContext}”
              </p>
              <p className="text-xs text-slate-500">{selectedTranslation}</p>
            </div>
          </div>

          <div className="p-4 bg-base-200/50 flex justify-end gap-3 border-t border-base-200 safe-pb-4">
            <button
              className="btn btn-ghost rounded-xl"
              onClick={() => setIsModalOpen(false)}
            >
              取消
            </button>
            <button
              className="btn btn-primary rounded-xl px-8"
              onClick={handleSaveVocabulary}
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="loading loading-spinner"></span>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" /> 保存生词
                </>
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setIsModalOpen(false)}>close</button>
        </form>
      </dialog>
    </div>
  );
}
