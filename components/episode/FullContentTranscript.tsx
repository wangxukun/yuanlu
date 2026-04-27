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

// We will use standard string template literals or clsx if needed. Let's just use string templates for simplicity, or provide a simple cn equivalent.
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

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
  isProofreading: boolean;
  editEn: string;
  editZh: string;
  onEditEn: (v: string) => void;
  onEditZh: (v: string) => void;
  onJump: (t: number) => void;
  onWordClick: (word: string, contextEn: string, contextZh: string) => void;
  onToggleLoop: () => void;
  activePopoverWord: string | null;
  onClosePopover: () => void;
  onSavePopover: (word: string, val: string) => void;
}

const SubtitleRow = React.memo(function SubtitleRow({
  sub,
  isActive,
  isLooping,
  isProofreading,
  editEn,
  editZh,
  onEditEn,
  onEditZh,
  onJump,
  onWordClick,
  onToggleLoop,
  activePopoverWord,
  onClosePopover,
  onSavePopover,
}: SubtitleRowProps) {
  if (isProofreading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative flex flex-col gap-4 p-6 rounded-2xl border border-indigo-200 bg-indigo-50/50 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-indigo-600 text-sm">
            edit_note
          </span>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            正在编辑
          </span>
        </div>
        <textarea
          className="w-full font-serif text-lg text-slate-800 bg-white border border-slate-200 rounded-xl p-4 focus:ring-2 focus:ring-indigo-600 focus:outline-none min-h-[100px] shadow-sm transition-shadow resize-y"
          value={editEn}
          onChange={(e) => onEditEn(e.target.value)}
        />
        <textarea
          className="w-full font-sans text-sm text-slate-600 bg-white border border-slate-200 rounded-xl p-4 focus:ring-2 focus:ring-indigo-600 focus:outline-none min-h-[80px] shadow-sm transition-shadow resize-y"
          value={editZh}
          onChange={(e) => onEditZh(e.target.value)}
        />
      </motion.div>
    );
  }

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
        <p
          className={cn(
            "font-sans text-sm sm:text-base leading-relaxed",
            isActive ? "text-slate-600" : "text-slate-400",
          )}
        >
          {sub.textZh.trim()}
        </p>
      </div>

      {isActive ? (
        <div className="flex flex-col gap-2 relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLoop();
            }}
            className={cn(
              "p-2 rounded-full shadow-md hover:shadow-lg active:scale-90 transition-all",
              isLooping
                ? "bg-indigo-600 text-white"
                : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200",
            )}
            title="单句循环"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings: isLooping ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              repeat
            </span>
          </button>

          {/* Popover */}
          <AnimatePresence>
            {activePopoverWord && (
              <WordPopover
                word={activePopoverWord}
                translation="待查询..."
                onClose={onClosePopover}
                onSave={(val) => onSavePopover(activePopoverWord, val)}
              />
            )}
          </AnimatePresence>
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLoop();
          }}
          className="opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-indigo-50 active:bg-indigo-100 transition-all text-indigo-400"
        >
          <span className="material-symbols-outlined">repeat</span>
        </button>
      )}
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
  const [isProofreadingMode, setIsProofreadingMode] = useState(false);
  const [editData, setEditData] = useState<
    Record<number, { en: string; zh: string }>
  >({});
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
    if (activeIndex === -1 || !scrollContainerRef.current || isProofreadingMode)
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
  }, [activeIndex, processed, isProofreadingMode]);

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

  const toggleProofreading = () => {
    if (!isProofreadingMode) {
      // Init edit data
      const data: Record<number, { en: string; zh: string }> = {};
      processed.forEach((s, i) => {
        data[i] = { en: s.textEn, zh: s.textZh };
      });
      setEditData(data);
    }
    setIsProofreadingMode(!isProofreadingMode);
  };

  const handleSubmitProofread = async () => {
    const changes = Object.entries(editData)
      .filter(([i]) => {
        const idx = Number(i);
        const orig = processed[idx];
        return (
          orig &&
          (editData[idx].en.trim() !== orig.textEn.trim() ||
            editData[idx].zh.trim() !== orig.textZh.trim())
        );
      })
      .map(([i]) => {
        const idx = Number(i);
        const orig = processed[idx];
        return {
          subtitleIndex: orig.id,
          originalTextEn: orig.textEn,
          originalTextZh: orig.textZh,
          modifiedTextEn: editData[idx].en.trim(),
          modifiedTextZh: editData[idx].zh.trim(),
        };
      });

    if (changes.length === 0) {
      toast.info("未进行任何更改");
      setIsProofreadingMode(false);
      return;
    }

    const isAdmin = session?.user?.role === "ADMIN";
    const endpoint = isAdmin
      ? "/api/proofread/direct-update"
      : "/api/proofread/submit";

    try {
      for (const change of changes) {
        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ episodeid: episode.episodeid, ...change }),
        });
      }
      toast.success(isAdmin ? "字幕已更新" : "校对已提交审核");
      setIsProofreadingMode(false);
    } catch {
      toast.error("提交失败");
    }
  };

  // Swipe down to close
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100) onClose();
  };

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
            <div className="max-w-[900px] mx-auto px-4 md:px-8 py-4 flex flex-col items-center relative">
              {/* Close Anchor */}
              <button
                onClick={onClose}
                className="mb-4 text-slate-400 hover:text-indigo-600 transition-colors active:scale-95 duration-200"
              >
                <span className="material-symbols-outlined text-4xl">
                  expand_more
                </span>
              </button>

              <div className="flex items-center justify-between w-full">
                {/* Podcast Metadata */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                    <img
                      alt="Podcast Thumbnail"
                      src={episode.coverUrl}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-indigo-600 text-sm">
                      {episode.podcast?.title || "未知节目"}
                    </span>
                    <h1 className="text-xl font-bold text-slate-900 leading-tight line-clamp-1 max-w-[200px] md:max-w-md">
                      {episode.title}
                    </h1>
                  </div>
                </div>

                {/* Proofreading Mode Toggle */}
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border border-slate-200 transition-all hover:shadow-sm">
                  <span className="text-sm font-medium text-slate-600">
                    校对模式
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isProofreadingMode}
                      onChange={toggleProofreading}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Proofread action bar */}
            <AnimatePresence>
              {isProofreadingMode && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-indigo-100 bg-indigo-50/50"
                >
                  <div className="max-w-[900px] mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
                    <span className="text-xs text-indigo-600 font-medium">
                      进入编辑模式，修改后请提交
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsProofreadingMode(false)}
                        className="text-xs px-4 py-2 rounded-full border border-indigo-200 text-indigo-600 hover:bg-white transition-colors font-medium"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSubmitProofread}
                        className="text-xs px-4 py-2 rounded-full text-white shadow-md transition-colors bg-indigo-600 hover:bg-indigo-700 font-medium"
                      >
                        提交修改
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </header>

          {/* ── Main Content Canvas ── */}
          <main
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto custom-scrollbar bg-white/50"
          >
            <div className="max-w-[900px] mx-auto px-4 md:px-8 py-8 space-y-4">
              <AnimatePresence>
                {processed.map((sub, index) => (
                  <SubtitleRow
                    key={sub.id || index}
                    sub={sub}
                    isActive={index === activeIndex}
                    isLooping={loopingIndex === index}
                    isProofreading={isProofreadingMode}
                    editEn={editData[index]?.en ?? sub.textEn}
                    editZh={editData[index]?.zh ?? sub.textZh}
                    onEditEn={(v) =>
                      setEditData((d) => ({
                        ...d,
                        [index]: { ...d[index], en: v },
                      }))
                    }
                    onEditZh={(v) =>
                      setEditData((d) => ({
                        ...d,
                        [index]: { ...d[index], zh: v },
                      }))
                    }
                    onJump={handleJump}
                    onWordClick={(word) => handleWordClick(index, word)}
                    onToggleLoop={() =>
                      setLoopingIndex((prev) => (prev === index ? null : index))
                    }
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
