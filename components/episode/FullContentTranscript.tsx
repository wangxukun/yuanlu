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
import { PencilSquareIcon } from "@heroicons/react/24/outline";

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

// ─── Word Popover ────────────────────────────────────────────────────────────
interface WordPopoverProps {
  word: string;
  translation: string;
  onClose: () => void;
  onSave: (translation: string) => void;
}

function WordPopover({ word, translation, onClose, onSave }: WordPopoverProps) {
  const [val, setVal] = useState(translation);

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 z-[205]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="absolute left-1/2 -top-28 -translate-x-1/2 w-64 bg-white rounded-xl shadow-[0_10px_20px_rgba(94,92,230,0.15)] border border-slate-200 p-4 z-[215]"
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-bold text-indigo-600">{word}</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50 active:scale-90"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        <input
          type="text"
          className="w-full text-sm text-slate-800 border-0 bg-slate-50 rounded-lg p-2 focus:ring-2 focus:ring-indigo-600 focus:outline-none mb-3 transition-shadow"
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            onClick={() => onSave(val)}
            className="flex-1 text-[11px] bg-indigo-100 text-indigo-800 py-2 rounded-lg font-medium hover:bg-indigo-200 active:scale-95 transition-all"
          >
            保存修改
          </button>
          <button
            onClick={() => {
              // trigger add to vocabulary
              onSave(val);
              toast.success("已加入生词本");
            }}
            className="flex-1 text-[11px] border border-indigo-200 text-indigo-600 py-2 rounded-lg font-medium hover:bg-indigo-50 active:scale-95 transition-all"
          >
            加入生词本
          </button>
        </div>
        <div className="absolute w-3 h-3 bg-white border-b border-r border-slate-200 rotate-45 -bottom-[7px] left-1/2 -translate-x-1/2 shadow-[2px_2px_4px_rgba(0,0,0,0.02)]"></div>
      </motion.div>
    </>
  );
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
  activePopoverWord: string | null;
  onClosePopover: () => void;
  onSavePopover: (word: string, val: string) => void;
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
  activePopoverWord,
  onClosePopover,
  onSavePopover,
}: SubtitleRowProps) {
  // Active or Normal State
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "group relative flex items-start gap-6 p-6 rounded-2xl transition-all duration-300",
        isActive
          ? "bg-slate-50 border-l-4 border-indigo-600 shadow-sm"
          : "hover:bg-slate-50 border-l-4 border-transparent cursor-pointer",
      )}
      onClick={() => {
        if (!isActive) onJump(sub.start);
      }}
    >
      <div className="flex-1 space-y-3">
        {(visibilityMode === "both" || visibilityMode === "en") && (
          <p
            className={cn(
              "font-serif text-lg sm:text-xl leading-relaxed tracking-wide",
              isActive ? "text-indigo-900 font-medium" : "text-slate-700",
            )}
          >
            {sub.textEn
              .trim()
              .split(" ")
              .map((word, i) => {
                const cleanWord = word.replace(/[.,!?;:"'()[\]{}]/g, "").trim();
                const isPopoverOpen = activePopoverWord === cleanWord;
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
                        "cursor-pointer rounded px-0.5 -mx-0.5 inline-block transition-colors select-text",
                        isPopoverOpen
                          ? "bg-indigo-100 text-indigo-800 underline decoration-indigo-400"
                          : "hover:text-indigo-600 hover:bg-indigo-50",
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
              "font-sans text-sm sm:text-base leading-relaxed",
              isActive ? "text-slate-600" : "text-slate-400",
            )}
          >
            {sub.textZh.trim()}
          </p>
        )}
      </div>

      {/* ── Control Column ── */}
      <div className="flex flex-col items-center gap-2 relative min-w-[40px]">
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
                  ? "text-indigo-600 scale-125"
                  : "text-indigo-300 hover:text-indigo-500"
                : "opacity-0 group-hover:opacity-100 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50",
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
                "opacity-0 group-hover:opacity-100 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50",
              )}
              title="校对字幕"
            >
              <PencilSquareIcon className="w-5 h-5" />
            </button>
          )
        )}

        {/* Popover */}
        <AnimatePresence>
          {isActive && activePopoverWord && (
            <WordPopover
              word={activePopoverWord}
              translation="待查询..."
              onClose={onClosePopover}
              onSave={(val) => onSavePopover(activePopoverWord, val)}
            />
          )}
        </AnimatePresence>
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

  // Proofread Modal State
  const [proofreadSub, setProofreadSub] = useState<ProcessedSubtitle | null>(
    null,
  );
  const [isProofreadOpen, setIsProofreadOpen] = useState(false);

  const userRole = session?.user?.role || "USER";
  const isLoggedIn = !!session?.user;
  const [activePopoverIndex, setActivePopoverIndex] = useState<number | null>(
    null,
  );
  const [activePopoverWord, setActivePopoverWord] = useState<string | null>(
    null,
  );

  // ── Processed subtitles ──
  const processed: ProcessedSubtitle[] = useMemo(() => {
    if (!Array.isArray(subtitles)) return [];
    return subtitles.map((item) => ({
      ...item,
      start: parseTimeStr(item.startTime),
      end: parseTimeStr(item.endTime),
    }));
  }, [subtitles]);

  // ── Active index tracking (RAF) ──
  const [activeIndex, setActiveIndex] = useState(-1);
  const activeRef = useRef(-1);

  useEffect(() => {
    if (!isPlayingThis || !isPlaying || !audioRef) return;
    let raf: number;
    let last = activeRef.current >= 0 ? activeRef.current : 0;
    const tick = () => {
      const t = audioRef.currentTime;
      let found = -1;
      const cur = processed[last];
      if (cur && t >= cur.start && t <= cur.end) {
        found = last;
      } else if (cur && t > cur.end) {
        for (let i = last + 1; i < processed.length; i++) {
          if (t >= processed[i].start && t <= processed[i].end) {
            found = i;
            last = i;
            break;
          }
          if (t < processed[i].start) break;
        }
      } else {
        found = processed.findIndex((s) => t >= s.start && t <= s.end);
        if (found !== -1) last = found;
      }
      if (found !== activeRef.current) {
        setActiveIndex(found);
        activeRef.current = found;
        // Close popover when moving to new subtitle
        setActivePopoverWord(null);
        setActivePopoverIndex(null);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, isPlayingThis, audioRef, processed]);

  // Fallback for paused
  useEffect(() => {
    if (isPlayingThis && !isPlaying) {
      const idx = processed.findIndex(
        (s) => currentTime >= s.start && currentTime <= s.end,
      );
      if (idx !== activeIndex) {
        setActiveIndex(idx);
        activeRef.current = idx;
        setActivePopoverWord(null);
        setActivePopoverIndex(null);
      }
    }
  }, [currentTime, isPlaying, isPlayingThis, processed, activeIndex]);

  // ── Auto-scroll to center ──
  useEffect(() => {
    if (activeIndex === -1 || !scrollContainerRef.current || isProofreadOpen)
      return;
    const el = document.getElementById(`fct-sub-${processed[activeIndex]?.id}`);
    if (!el) return;
    const container = scrollContainerRef.current;
    const elRect = el.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    const targetY = cRect.height * 0.4; // Slightly above center
    const offset = elRect.top - cRect.top - targetY;
    container.scrollTo({
      top: container.scrollTop + offset,
      behavior: "smooth",
    });
  }, [activeIndex, processed, isProofreadOpen]);

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
    (index: number, word: string) => {
      if (isPlayingThis && isPlaying && pause) pause();
      setActivePopoverIndex(index);
      setActivePopoverWord(word);
      // Auto-jump to this sentence if not already active
      if (activeIndex !== index) {
        handleJump(processed[index].start);
      }
    },
    [isPlayingThis, isPlaying, pause, activeIndex, handleJump, processed],
  );

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
          className="fixed inset-0 z-[200] bg-white/95 backdrop-blur-xl flex flex-col overflow-hidden"
        >
          {/* ── Header Section ── */}
          <header className="w-full bg-white/80 border-b border-slate-200 sticky top-0 z-10 transition-colors duration-300">
            <div className="max-w-[900px] mx-auto px-4 md:px-8 py-3 flex items-center justify-center relative min-h-[64px]">
              {/* ── Subtitle Visibility Controls (Left) ── */}
              <div className="absolute left-2 md:left-8 flex items-center bg-slate-100/80 backdrop-blur-sm p-0.5 md:p-1 rounded-2xl gap-0.5 border border-slate-200/50 shadow-sm transition-all duration-300">
                <button
                  onClick={() => setVisibilityMode("both")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 md:px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-300",
                    visibilityMode === "both"
                      ? "bg-white text-indigo-600 shadow-[0_2px_8px_rgba(79,70,229,0.15)] scale-105"
                      : "text-slate-500 hover:text-indigo-500 hover:bg-white/50",
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
                      ? "bg-white text-indigo-600 shadow-[0_2px_8px_rgba(79,70,229,0.15)] scale-105"
                      : "text-slate-500 hover:text-indigo-500 hover:bg-white/50",
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
                      ? "bg-white text-indigo-600 shadow-[0_2px_8px_rgba(79,70,229,0.15)] scale-105"
                      : "text-slate-500 hover:text-indigo-500 hover:bg-white/50",
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
                className="text-slate-400 hover:text-indigo-600 transition-colors active:scale-95 duration-200 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-4xl">
                  expand_more
                </span>
              </button>

              {/* ── Proofreading Toggle (Right) ── */}
              <div className="absolute right-2 md:right-8 flex items-center">
                {isLoggedIn && (
                  <div className="form-control">
                    <label className="label cursor-pointer gap-2 p-0">
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                        字幕校对
                      </span>
                      <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={isProofreadingMode}
                        onChange={() =>
                          setIsProofreadingMode(!isProofreadingMode)
                        }
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ── Main Content Canvas ── */}
          <main
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto scrollbar-none bg-white/50"
          >
            <div className="max-w-[900px] mx-auto px-4 md:px-8 py-8 space-y-4">
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
                    onWordClick={(word) => handleWordClick(index, word)}
                    onToggleLoop={() =>
                      setLoopingIndex((prev) => (prev === index ? null : index))
                    }
                    onProofread={(sub) => {
                      setProofreadSub(sub);
                      setIsProofreadOpen(true);
                    }}
                    activePopoverWord={
                      activePopoverIndex === index ? activePopoverWord : null
                    }
                    onClosePopover={() => {
                      setActivePopoverIndex(null);
                      setActivePopoverWord(null);
                    }}
                    onSavePopover={(word, val) => {
                      console.log("Saved popover val", word, val);
                      setActivePopoverIndex(null);
                      setActivePopoverWord(null);
                    }}
                  />
                ))}
              </AnimatePresence>
              <div className="h-48"></div>{" "}
              {/* Bottom spacer for PlayControlBar */}
            </div>
          </main>

          {/* Background Decoration */}
          <div className="fixed inset-0 -z-10 flex items-center justify-center opacity-[0.03] pointer-events-none">
            <span className="material-symbols-outlined text-[400px]">
              menu_book
            </span>
          </div>

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
