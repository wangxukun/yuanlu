/**
 * type: uploaded file
 * fileName: yuanlu/components/episode/InteractiveTranscript.tsx
 * content:
 */
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
} from "@heroicons/react/24/outline";
import { Episode } from "@/core/episode/episode.entity";
import { toast } from "sonner";
import clsx from "clsx";

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

// --- 辅助函数 ---
function parseTimeStr(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return 0;
  let seconds = 0,
    minutes = 0,
    hours = 0;
  if (parts.length === 3) {
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    seconds = parseFloat(parts[2].replace(",", "."));
  } else {
    minutes = parseInt(parts[0], 10);
    seconds = parseFloat(parts[1].replace(",", "."));
  }
  return hours * 3600 + minutes * 60 + seconds;
}

// --- 独立子组件：字幕行 (性能优化关键) ---
// 使用 React.memo 确保只有 isActive 或显示设置改变时才重渲染
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
  const itemRef = useRef<HTMLDivElement>(null);

  // 自动滚动的 ref 暴露逻辑，通过 isActive 判断是否需要滚动
  useEffect(() => {
    if (isActive && itemRef.current) {
      // 将 ref 传给父组件处理滚动，或者在这里处理滚动 (这里选择在这里触发自定义事件或由父组件统一处理ref)
      // 为了不破坏原有的 activeRef 逻辑，我们在父组件通过 key 或 index 获取 ref 会更复杂。
      // 这里采用简单策略：加上 id 方便父组件查询，或者复用原有的 activeRef 逻辑（父组件渲染时挂载 ref）。
      // 鉴于 memo 组件不能直接透传 ref 除非用 forwardRef，我们这里只需渲染内容。
      // 滚动逻辑在父组件通过 data-active 属性查找更解耦，或者由父组件传递 ref callback。
    }
  }, [isActive]);

  return (
    <div
      id={`subtitle-${sub.id}`} // 添加 ID 方便滚动定位
      data-active={isActive}
      className={clsx(
        "group relative rounded-xl p-4 sm:p-6 transition-all duration-200 border-l-4",
        isActive
          ? "bg-orange-50/80 border-orange-400 shadow-sm"
          : "bg-transparent border-transparent hover:bg-base-200/30",
      )}
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
              <span
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  onWordClick(word, sub.textEn, sub.textZh);
                }}
                className="cursor-pointer rounded hover:bg-primary/20 hover:text-primary-focus transition-colors px-0.5 inline-block active:scale-95 select-text"
              >
                {word}{" "}
              </span>
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
  // 即使解构了 currentTime，由于 SubtitleItem 被 memo 化，
  // 只要 activeIndex 不变，列表的大部分就不会重渲染，从而消除卡顿。
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

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const activeIndexRef = useRef<number>(-1);

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

  // 5.1 动态同步：使用 requestAnimationFrame
  useEffect(() => {
    if (!isPlayingThisEpisode || !isPlaying || !audioRef) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    // 优化：记录上一次找到的索引，减少遍历次数
    let lastFoundIndex =
      activeIndexRef.current >= 0 ? activeIndexRef.current : 0;

    const loop = () => {
      const t = audioRef.currentTime;

      // 智能搜索算法：优先检查当前索引及后续索引
      let foundIndex = -1;

      // 1. 检查当前缓存索引是否仍匹配（最常见情况）
      const currentSub = processedSubtitles[lastFoundIndex];
      if (currentSub && t >= currentSub.start && t <= currentSub.end) {
        foundIndex = lastFoundIndex;
      } else {
        // 2. 如果时间前进了，尝试向后搜索
        if (currentSub && t > currentSub.end) {
          // 快速向后查找，通常就在下一个
          for (let i = lastFoundIndex + 1; i < processedSubtitles.length; i++) {
            if (
              t >= processedSubtitles[i].start &&
              t <= processedSubtitles[i].end
            ) {
              foundIndex = i;
              lastFoundIndex = i; // 更新缓存
              break;
            }
            // 如果当前时间还小于字幕开始时间，说明在间隙中，没必要继续找了
            if (t < processedSubtitles[i].start) break;
          }
        } else {
          // 3. 时间后退了（用户回跳），或者还没找到，执行全局二分查找或 findIndex
          // 这里用 findIndex 足够快，因为是异常路径
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

  // 5.2 静态同步：当暂停或拖动进度条时
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

  // 6. Auto Scroll
  // 使用 ref 直接操作 DOM，避免重新渲染
  useEffect(() => {
    if (autoScroll && activeIndex !== -1) {
      // 通过 ID 查找 DOM 节点，比 ref 数组更轻量
      const activeEl = document.getElementById(
        `subtitle-${processedSubtitles[activeIndex]?.id}`,
      );
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [activeIndex, autoScroll, processedSubtitles]);

  // 7. Interactions
  // 使用 useCallback 避免传递给 Memo 子组件时失效
  const handleJump = useCallback(
    (startTime: number) => {
      console.log("Jump to", startTime);
      if (isPlayingThisEpisode && audioRef) {
        audioRef.currentTime = startTime;
        setCurrentTime(startTime); // 立即更新 store
        play();
      } else {
        setCurrentEpisode(episode);
        setCurrentAudioUrl(episode.audioUrl);
        // 注意：这里可能需要设置 initialTime，但 Player 组件通常会处理 0，如果需要精确跳转到某处，
        // 可能需要修改 Player Store 的 setAudio 逻辑以接受 startTime
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
      if (isPlayingThisEpisode && isPlaying && pause) pause(); // 安全调用

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

      {/* --- 未登录提示条 --- */}
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
          />
        ))}
      </div>

      {/* --- 生词弹窗 (保持原样) --- */}
      <dialog className={clsx("modal", isModalOpen && "modal-open")}>
        <div className="modal-box bg-base-100 max-w-lg rounded-3xl shadow-2xl p-0 overflow-hidden border border-base-200">
          {/* Modal 内容省略，保持原逻辑不变 */}
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

              {/* 链接按钮逻辑保持不变 */}
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
