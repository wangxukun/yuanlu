"use client";

import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { usePlayerStore } from "@/store/player-store";
import { useSession } from "next-auth/react";
import { Episode } from "@/core/episode/episode.entity";
import { toast } from "sonner";
import { parseTimeStr } from "@/lib/tools";
import { MergedSubtitleItem, ProcessedSubtitle } from "./transcript/types";
import { ProofreadModal } from "./transcript/ProofreadModal";
import { VocabularyModal } from "./transcript/VocabularyModal";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import ThemeSwitcher from "@/components/theme-switcher";
import { useTranscriptScroll } from "./transcript/useTranscriptScroll";

// We will use standard string template literals or clsx if needed. Let's just use string templates for simplicity, or provide a simple cn equivalent.
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Types ───────────────────────────────────────────────────────────────────
type VisibilityMode = "both" | "en" | "zh";

// ─── Props ───────────────────────────────────────────────────────────────────
interface FullContentTranscriptProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: MergedSubtitleItem[];
  episode: Episode;
}

// ─── Subtitle Row ────────────────────────────────────────────────────────────
interface SubtitleRowProps {
  sub: ProcessedSubtitle;
  isActive: boolean;
  isLooping: boolean;
  isLoggedIn: boolean;
  visibilityMode: VisibilityMode;
  isProofreadingMode: boolean;
  onJump: (t: number) => void;
  onWordClick: (word: string, contextEn: string, contextZh: string) => void;
  onToggleLoop: () => void;
  onProofread: (sub: ProcessedSubtitle) => void;
}

const SubtitleRow = React.memo(function SubtitleRow({
  sub,
  isActive,
  isLooping,
  isLoggedIn,
  visibilityMode,
  isProofreadingMode,
  onJump,
  onWordClick,
  onToggleLoop,
  onProofread,
}: SubtitleRowProps) {
  // Active or Normal State
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "group relative flex items-start gap-1 md:gap-6 px-2 py-2 md:p-6 md:rounded-2xl transition-all duration-300",
        isActive
          ? "bg-slate-50 dark:bg-slate-900/50 border-l-0 border-l-4 border-indigo-600 shadow-sm"
          : "hover:bg-slate-50 dark:hover:bg-slate-900/30 border-l-0 border-l-4 border-transparent cursor-pointer",
      )}
      id={`fct-sub-${sub.id}`}
      onClick={() => {
        if (!isActive) onJump(sub.start);
      }}
    >
      <div className="flex-1 space-y-1 md:space-y-3">
        {(visibilityMode === "both" || visibilityMode === "en") && (
          <p
            className={cn(
              "font-serif text-lg sm:text-xl leading-snug sm:leading-relaxed tracking-wide",
              isActive
                ? "text-indigo-900 dark:text-indigo-100 font-medium"
                : "text-slate-700 dark:text-slate-200",
            )}
          >
            {sub.textEn
              .trim()
              .split(" ")
              .map((word, i) => {
                const cleanWord = word.replace(/[.,!?;:"'()[\]{}]/g, "").trim();
                return (
                  <React.Fragment key={i}>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        const sel = window.getSelection();
                        if (sel && !sel.isCollapsed) return;
                        onWordClick(cleanWord, sub.textEn, sub.textZh);
                      }}
                      className={cn(
                        "cursor-pointer rounded px-0.5 -mx-0.5 inline-block transition-colors select-text hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30",
                      )}
                    >
                      {word}
                    </span>{" "}
                  </React.Fragment>
                );
              })}
          </p>
        )}
        {(visibilityMode === "both" || visibilityMode === "zh") && (
          <p
            className={cn(
              "font-sans text-sm sm:text-base leading-normal sm:leading-relaxed",
              isActive
                ? "text-slate-600 dark:text-slate-300"
                : "text-slate-400 dark:text-slate-500",
            )}
          >
            {sub.textZh.trim()}
          </p>
        )}
      </div>

      {/* ── Control Column ── */}
      <div className="flex flex-col items-center gap-2 relative min-w-[32px] md:min-w-[40px]">
        {!isProofreadingMode ? (
          /* Loop Toggle */
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLoop();
            }}
            className={cn(
              "p-1.5 rounded-full transition-all duration-300",
              isActive
                ? isLooping
                  ? "text-indigo-600 dark:text-indigo-400 scale-125"
                  : "text-indigo-300 dark:text-indigo-700 hover:text-indigo-500 dark:hover:text-indigo-400"
                : "opacity-0 group-hover:opacity-100 text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30",
            )}
            title="单句循环"
          >
            <span
              className="material-symbols-outlined text-xl"
              style={{
                fontVariationSettings: isLooping ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              {isLooping ? "repeat_one" : "repeat"}
            </span>
          </button>
        ) : (
          /* Proofread Button */
          isLoggedIn &&
          onProofread && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onProofread(sub);
              }}
              className={cn(
                "p-1.5 rounded-full transition-all duration-300",
                "opacity-0 group-hover:opacity-100 text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30",
              )}
              title="校对字幕"
            >
              <PencilSquareIcon className="w-5 h-5" />
            </button>
          )
        )}
      </div>
    </motion.div>
  );
});

// ─── Main Component ──────────────────────────────────────────────────────────
export default function FullContentTranscript({
  isOpen,
  onClose,
  subtitles,
  episode,
}: FullContentTranscriptProps) {
  const { data: session } = useSession();
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

  const isPlayingThis = currentEpisode?.episodeid === episode.episodeid;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── States ──
  const [loopingIndex, setLoopingIndex] = useState<number | null>(null);

  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>("both");
  const [isProofreadingMode, setIsProofreadingMode] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // Proofread Modal State
  const [proofreadSub, setProofreadSub] = useState<ProcessedSubtitle | null>(
    null,
  );
  const [isProofreadOpen, setIsProofreadOpen] = useState(false);

  const userRole = session?.user?.role || "USER";
  const isLoggedIn = !!session?.user;
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

  // ── Processed subtitles ──
  const processed: ProcessedSubtitle[] = useMemo(() => {
    if (!Array.isArray(subtitles)) return [];
    return subtitles.map((item) => ({
      ...item,
      start: parseTimeStr(item.startTime),
      end: parseTimeStr(item.endTime),
    }));
  }, [subtitles]);

  // ── Sync Logic (Hook) ──
  const { activeIndex } = useTranscriptScroll(
    audioRef,
    isPlaying,
    isPlayingThis,
    processed,
    currentTime,
    autoScroll,
    "fct-sub",
  );

  // ── Single-sentence loop ──
  useEffect(() => {
    if (loopingIndex === null || !isPlayingThis || !audioRef) return;
    const sub = processed[loopingIndex];
    if (!sub) return;
    const check = () => {
      if (audioRef.currentTime >= sub.end) {
        audioRef.currentTime = sub.start;
      }
    };
    const iv = setInterval(check, 100);
    return () => clearInterval(iv);
  }, [loopingIndex, isPlayingThis, audioRef, processed]);

  // ── Handlers ──
  const handleJump = useCallback(
    (t: number) => {
      if (isPlayingThis && audioRef) {
        audioRef.currentTime = t;
        setCurrentTime(t);
        play();
      } else {
        setCurrentEpisode(episode);
        setCurrentAudioUrl(episode.audioUrl);
      }
    },
    [
      isPlayingThis,
      audioRef,
      setCurrentTime,
      play,
      setCurrentEpisode,
      setCurrentAudioUrl,
      episode,
    ],
  );

  const handleWordClick = useCallback(
    async (
      index: number,
      word: string,
      contextEn: string,
      contextZh: string,
    ) => {
      if (isPlayingThis && isPlaying && pause) pause();

      // Auto-jump to this sentence if not already active
      if (activeIndex !== index) {
        handleJump(processed[index].start);
      }

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
    [isPlayingThis, isPlaying, pause, activeIndex, handleJump, processed],
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
          timestamp: isPlayingThis && audioRef ? audioRef.currentTime : 0,
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

  // Handlers

  // Swipe down to close
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100) onClose();
  };

  // ── Body Scroll Lock ──
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="fixed inset-0 z-[200] bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl flex flex-col overflow-hidden"
        >
          {/* ── Header Section ── */}
          <header className="w-full bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 transition-colors duration-300">
            <div className="max-w-[900px] mx-auto px-4 md:px-8 py-3 flex items-center justify-center relative min-h-[64px]">
              {/* ── Subtitle Visibility Controls (Left) ── */}
              <div className="absolute left-2 md:left-8 flex items-center bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm p-0.5 md:p-1 rounded-2xl gap-0.5 border border-slate-200/50 dark:border-slate-700/50 shadow-sm transition-all duration-300">
                <button
                  onClick={() => setVisibilityMode("both")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 md:px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-300",
                    visibilityMode === "both"
                      ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-[0_2px_8px_rgba(79,70,229,0.15)] scale-105"
                      : "text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-300 hover:bg-white/50 dark:hover:bg-slate-700/50",
                  )}
                  title="显示中英双语"
                >
                  <span className="material-symbols-outlined text-sm">
                    translate
                  </span>
                  <span className="hidden md:inline">双语</span>
                </button>
                <button
                  onClick={() => setVisibilityMode("en")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 md:px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-300",
                    visibilityMode === "en"
                      ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-[0_2px_8px_rgba(79,70,229,0.15)] scale-105"
                      : "text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-300 hover:bg-white/50 dark:hover:bg-slate-700/50",
                  )}
                  title="仅显示英文"
                >
                  <span className="material-symbols-outlined text-sm">abc</span>
                  <span className="hidden md:inline">英文</span>
                </button>
                <button
                  onClick={() => setVisibilityMode("zh")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 md:px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-300",
                    visibilityMode === "zh"
                      ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-[0_2px_8px_rgba(79,70,229,0.15)] scale-105"
                      : "text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-300 hover:bg-white/50 dark:hover:bg-slate-700/50",
                  )}
                  title="仅显示中文"
                >
                  <span className="material-symbols-outlined text-sm">
                    text_fields
                  </span>
                  <span className="hidden md:inline">中文</span>
                </button>
              </div>

              {/* Close Anchor (Center) */}
              <button
                onClick={onClose}
                className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors active:scale-95 duration-200 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-4xl">
                  expand_more
                </span>
              </button>

              {/* ── Function Groups (Right) ── */}
              <div className="absolute right-2 md:right-8 flex items-center gap-2 md:gap-4">
                {/* ── Auto Scroll Toggle ── */}
                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 border",
                    autoScroll
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                      : "text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800",
                  )}
                  title={autoScroll ? "已开启自动滚动" : "已关闭自动滚动"}
                >
                  <span
                    className="material-symbols-outlined text-sm"
                    style={{
                      fontVariationSettings: autoScroll
                        ? "'FILL' 1"
                        : "'FILL' 0",
                    }}
                  >
                    {autoScroll ? "sync" : "sync_disabled"}
                  </span>
                  <span className="hidden sm:inline">自动滚动</span>
                </button>

                <ThemeSwitcher
                  className={cn(
                    "flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 border border-transparent text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800",
                  )}
                >
                  {/* <span className="hidden sm:inline">深浅模式</span> */}
                </ThemeSwitcher>
                {isLoggedIn && (
                  <button
                    onClick={() => setIsProofreadingMode(!isProofreadingMode)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 border",
                      isProofreadingMode
                        ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                        : "text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800",
                    )}
                    title={isProofreadingMode ? "退出校对模式" : "进入校对模式"}
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">字幕校对</span>
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* ── Main Content Canvas ── */}
          <main
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto scrollbar-none bg-white/50 dark:bg-slate-950/50"
          >
            <div className="max-w-[900px] mx-auto px-0 sm:px-4 md:px-8 py-4 md:py-8 space-y-1 md:space-y-4">
              <AnimatePresence>
                {processed.map((sub, index) => (
                  <SubtitleRow
                    key={sub.id || index}
                    sub={sub}
                    isActive={index === activeIndex}
                    isLooping={loopingIndex === index}
                    isLoggedIn={isLoggedIn}
                    visibilityMode={visibilityMode}
                    isProofreadingMode={isProofreadingMode}
                    onJump={handleJump}
                    onWordClick={(word, en, zh) =>
                      handleWordClick(index, word, en, zh)
                    }
                    onToggleLoop={() =>
                      setLoopingIndex((prev) => (prev === index ? null : index))
                    }
                    onProofread={(sub) => {
                      setProofreadSub(sub);
                      setIsProofreadOpen(true);
                    }}
                  />
                ))}
              </AnimatePresence>
              <div className="h-48"></div>{" "}
              {/* Bottom spacer for PlayControlBar */}
            </div>
          </main>

          {/* Background Decoration */}
          <div className="fixed inset-0 -z-10 flex items-center justify-center opacity-[0.03] dark:opacity-[0.05] pointer-events-none text-slate-900 dark:text-slate-700">
            <span className="material-symbols-outlined text-[400px]">
              menu_book
            </span>
          </div>
          <VocabularyModal
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            selectedWord={selectedWord}
            selectedContext={selectedContext}
            selectedTranslation={selectedTranslation}
            definition={definition}
            setDefinition={setDefinition}
            isLoadingDefinition={isLoadingDefinition}
            wordDetails={wordDetails}
            isSaving={isSaving}
            onSave={handleSaveVocabulary}
            onPlayAudio={playWordAudio}
          />

          <ProofreadModal
            isOpen={isProofreadOpen}
            onClose={() => setIsProofreadOpen(false)}
            subtitle={proofreadSub}
            episodeid={episode.episodeid}
            userRole={userRole}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
