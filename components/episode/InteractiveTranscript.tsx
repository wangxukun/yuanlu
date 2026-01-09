"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { usePlayerStore } from "@/store/player-store";
import { useSession } from "next-auth/react"; // [新增] 引入 session 钩子
import {
  PlayCircleIcon,
  SpeakerWaveIcon,
  LanguageIcon,
  BookOpenIcon,
  XMarkIcon,
  PauseCircleIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  InformationCircleIcon, // [新增] 引入提示图标
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

export default function InteractiveTranscript({
  subtitles,
  episode,
}: InteractiveTranscriptProps) {
  // 1. Auth State [新增]
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

  // Refs for scrolling
  const activeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // 5. Sync Highlight
  useEffect(() => {
    if (!isPlayingThisEpisode) {
      if (activeIndex !== -1) setActiveIndex(-1);
      return;
    }
    const index = processedSubtitles.findIndex(
      (sub) => currentTime >= sub.start && currentTime <= sub.end,
    );
    if (index !== -1 && index !== activeIndex) {
      setActiveIndex(index);
    }
  }, [currentTime, processedSubtitles, activeIndex, isPlayingThisEpisode]);

  // 6. Auto Scroll
  useEffect(() => {
    if (autoScroll && activeIndex !== -1 && activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex, autoScroll]);

  // 7. Interactions
  const handleJump = (startTime: number) => {
    if (isPlayingThisEpisode && audioRef) {
      audioRef.currentTime = startTime;
      setCurrentTime(startTime);
      play();
    } else {
      setCurrentEpisode(episode);
      setCurrentAudioUrl(episode.audioUrl);
    }
  };

  const handleWordClick = async (
    word: string,
    contextEn: string,
    contextZh: string,
  ) => {
    // [可选优化] 如果未登录，点击时也可以弹出提示，或者允许查词但不允许保存
    // 这里保持原逻辑，允许查词，但在保存时后端会校验（或需要前端额外处理）

    if (isPlayingThisEpisode && isPlaying) pause();

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
  };

  const handleSaveVocabulary = async () => {
    if (!selectedWord) return;

    // [新增] 登录检查
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
          timestamp: isPlayingThisEpisode ? currentTime : 0,
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

      {/* --- [新增] 未登录提示条 --- */}
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
        {processedSubtitles.map((sub, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={sub.id || index}
              ref={isActive ? activeRef : null}
              className={clsx(
                "group relative rounded-xl p-4 sm:p-6 transition-all duration-500 border-l-4",
                isActive
                  ? "bg-orange-50/80 border-orange-400 shadow-sm"
                  : "bg-transparent border-transparent hover:bg-base-200/30",
              )}
            >
              <div className="flex gap-4 sm:gap-6 items-start">
                <button
                  onClick={() => handleJump(sub.start)}
                  className={clsx(
                    "mt-1.5 flex-shrink-0 transition-all duration-300 transform",
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
                      isActive
                        ? "text-slate-900 font-medium"
                        : "text-slate-700",
                    )}
                  >
                    {sub.textEn.split(" ").map((word, i) => (
                      <span
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWordClick(word, sub.textEn, sub.textZh);
                        }}
                        className="cursor-pointer rounded hover:bg-primary/20 hover:text-primary-focus transition-colors px-0.5 inline-block active:scale-95 select-text"
                      >
                        {word}{" "}
                      </span>
                    ))}
                  </p>

                  <div
                    className={clsx(
                      "overflow-hidden transition-all duration-500 ease-in-out",
                      showTranslation
                        ? "max-h-40 opacity-100 mt-3"
                        : "max-h-0 opacity-0 mt-0",
                    )}
                  >
                    <p
                      className={clsx(
                        "font-sans text-sm sm:text-base leading-7 tracking-wider",
                        isActive
                          ? "text-slate-600 font-medium"
                          : "text-slate-400",
                      )}
                    >
                      {sub.textZh}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- 生词弹窗 --- */}
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
                    title="在桌面版网页中查看"
                  >
                    <span>查看详情</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-3 h-3"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                      />
                    </svg>
                  </a>
                )}

                <div className="md:hidden flex gap-2">
                  {wordDetails.mobileUrl && (
                    <a
                      href={wordDetails.mobileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-xs btn-outline btn-accent"
                    >
                      查看词典
                    </a>
                  )}
                  {wordDetails.dictUrl && (
                    <a
                      href={wordDetails.dictUrl}
                      className="btn btn-xs btn-ghost text-accent opacity-80"
                    >
                      打开APP
                    </a>
                  )}
                </div>
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
