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

// 新增：划词菜单状态
interface SelectionMenuState {
  visible: boolean;
  x: number;
  y: number;
  text: string;
  contextEn: string;
  contextZh: string;
}

// --- 独立子组件：字幕行 (性能优化关键) ---
const SubtitleItem = memo(function SubtitleItem({
  sub,
  isActive,
  isPlaying,
  showTranslation,
  onJump,
  onWordClick,
  onTextSelection, // 新增回调
}: {
  sub: ProcessedSubtitle;
  isActive: boolean;
  isPlaying: boolean;
  showTranslation: boolean;
  onJump: (time: number) => void;
  onWordClick: (word: string, contextEn: string, contextZh: string) => void;
  onTextSelection: (
    text: string,
    rect: DOMRect,
    contextEn: string,
    contextZh: string,
  ) => void;
}) {
  // 处理鼠标抬起，检测划词
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (text.length > 0) {
      // 获取选区坐标
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      onTextSelection(text, rect, sub.textEn, sub.textZh);
    }
  };

  return (
    <div
      id={`subtitle-${sub.id}`}
      data-active={isActive}
      className={clsx(
        "group relative rounded-xl p-4 sm:p-6 transition-all duration-200 border-l-4",
        isActive
          ? "bg-orange-50/80 border-orange-400 shadow-sm"
          : "bg-transparent border-transparent hover:bg-base-200/30",
      )}
      onMouseUp={handleMouseUp} // 绑定划词检测
    >
      <div className="flex gap-4 sm:gap-6 items-start">
        <button
          onClick={() => onJump(sub.start)}
          className={clsx(
            "mt-1.5 flex-shrink-0 transition-all duration-200 transform",
            isActive
              ? "text-orange-500 scale-110 opacity-100"
              : "text-base-content/20 opacity-0 group-hover:opacity-100 hover:text-primary hover:scale-110",
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
            {sub.textEn.split(" ").map((word, i) => (
              <React.Fragment key={i}>
                <span
                  onClick={(e) => {
                    // 防止划词时触发单次点击
                    const selection = window.getSelection();
                    if (selection && !selection.isCollapsed) {
                      return;
                    }
                    e.stopPropagation();
                    onWordClick(word, sub.textEn, sub.textZh);
                  }}
                  className="cursor-pointer rounded transition-colors px-0.5 -mx-0.5 inline-block active:scale-95 select-text relative hover:z-10 hover:bg-orange-200 hover:text-orange-700"
                >
                  {word}
                </span>
                {/* 将空格移到 span 外部，确保划词时包含空格 */}{" "}
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
              {sub.textZh}
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
  const menuRef = useRef<HTMLDivElement>(null); // 菜单 Ref

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

  // 5. Sync Highlight (Core Logic Optimized)
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

  // Static Sync
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

  // Scroll Helper
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

  // Auto Scroll
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

  // --- 交互逻辑 ---

  const handleJump = useCallback(
    (startTime: number) => {
      // 如果菜单打开，跳转时关闭菜单
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

  // 单击单词 (现有逻辑)
  const handleWordClick = useCallback(
    async (word: string, contextEn: string, contextZh: string) => {
      // 点击单词时，关闭之前的划词菜单
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

  // 划词处理回调
  const handleTextSelection = useCallback(
    (text: string, rect: DOMRect, contextEn: string, contextZh: string) => {
      setSelectionMenu({
        visible: true,
        // 居中显示在选区上方
        x: rect.left + rect.width / 2,
        y: rect.top,
        text,
        contextEn,
        contextZh,
      });
    },
    [],
  );

  // 全局点击监听，用于关闭划词菜单
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // 如果点击的是菜单内部，不关闭
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      // 否则关闭菜单
      setSelectionMenu((prev) =>
        prev.visible ? { ...prev, visible: false } : prev,
      );
    };

    window.addEventListener("mousedown", handleGlobalClick);
    return () => {
      window.removeEventListener("mousedown", handleGlobalClick);
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
      {/* --- 工具栏 (Toolbar) --- */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-base-200/60 sticky top-0 bg-base-100/95 backdrop-blur z-10 py-2">
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
              autoScroll ? "text-primary bg-primary/5" : "text-base-content/40",
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

      {/* --- 字幕内容区 (Transcript Content) --- */}
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
            onTextSelection={handleTextSelection} // 传入回调
          />
        ))}
      </div>

      {/* --- Step 1 新增: 悬浮菜单 (Floating Menu) --- */}
      {selectionMenu.visible && (
        <div
          ref={menuRef}
          className="fixed z-50 animate-in fade-in zoom-in-95 duration-200"
          style={{
            left: selectionMenu.x,
            top: selectionMenu.y,
            transform: "translate(-50%, -120%)", // 向上偏移显示在文字上方
          }}
        >
          <div className="bg-slate-900 text-white rounded-lg shadow-xl px-2 py-1.5 flex items-center gap-2 text-sm pointer-events-auto">
            <span className="px-1 max-w-[150px] truncate font-serif italic border-r border-slate-700 mr-1">
              {selectionMenu.text}
            </span>
            <button
              className="hover:text-primary transition-colors flex items-center gap-1"
              onClick={() => {
                // 暂时直接调用查词逻辑（Step 2 将完善这里）
                handleWordClick(
                  selectionMenu.text,
                  selectionMenu.contextEn,
                  selectionMenu.contextZh,
                );
                // 关闭菜单
                setSelectionMenu((prev) => ({ ...prev, visible: false }));
                // 清除选区
                window.getSelection()?.removeAllRanges();
              }}
            >
              <PlusCircleIcon className="w-4 h-4" />
              查词/翻译
            </button>
          </div>
          {/* 小箭头 */}
          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900"></div>
        </div>
      )}

      {/* --- 生词弹窗 (保持原样) --- */}
      <dialog className={clsx("modal", isModalOpen && "modal-open")}>
        <div className="modal-box bg-base-100 max-w-lg rounded-3xl shadow-2xl p-0 overflow-hidden border border-base-200">
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
                <h2 className="text-3xl font-serif font-black text-slate-800">
                  {selectedWord}
                </h2>
                {wordDetails.speakUrl && (
                  <button
                    onClick={playWordAudio}
                    className="btn btn-circle btn-sm btn-primary btn-outline"
                  >
                    <SpeakerWaveIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-base-content/40 uppercase tracking-wider">
                  Definition
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
                    className="hidden md:inline-flex items-center gap-1 btn btn-xs btn-outline btn-accent"
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

          <div className="p-4 bg-base-200/50 flex justify-end gap-3 border-t border-base-200">
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
