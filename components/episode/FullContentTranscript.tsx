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
import { useRouter } from "next/navigation";
import { Episode } from "@/core/episode/episode.entity";
import { toast } from "sonner";
import { checkExclusivePlay } from "@/lib/client/auth-utils";
import { handleDictionaryQuotaBlock } from "@/lib/client/dictionary-quota";
import { MergedSubtitleItem, ProcessedSubtitle } from "./transcript/types";
import { ProofreadModal } from "./transcript/ProofreadModal";
import { VocabularyModal } from "./transcript/VocabularyModal";
import { SelectionMenu } from "./transcript/SelectionMenu";
import { useTranscriptSelection } from "./transcript/useTranscriptSelection";
import { useTranscriptKeyboard } from "./transcript/useTranscriptKeyboard";
import { EpisodeVocabItem } from "./transcript/LearningPanel";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import ThemeSwitcher from "@/components/theme-switcher";
import PlaylistDropdown from "@/components/controls/PlaylistDropdown";
import { useTranscriptScroll } from "./transcript/useTranscriptScroll";
import { DictationItem } from "./transcript/DictationItem";
import type { DictEntryDTO } from "@/core/dictionary/dto";
import { useWordHighlight } from "@/components/transcript/useWordHighlight";

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

const FONT_SIZE_LEVELS = [
  {
    en: "text-[16px] sm:text-[18px] leading-[1.6]",
    zh: "text-[13px] sm:text-[14px] leading-[1.6]",
  },
  {
    en: "text-[18px] sm:text-[20px] leading-[1.6]",
    zh: "text-[14px] sm:text-[15px] leading-[1.6]",
  },
  {
    en: "text-[20px] sm:text-[22px] leading-[1.6]",
    zh: "text-[15px] sm:text-[16px] leading-[1.6]",
  },
] as const;

const FONT_SIZE_STORAGE_KEY = "fct-font-size-level";

function formatSec(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Subtitle Row ────────────────────────────────────────────────────────────
interface SubtitleRowProps {
  sub: ProcessedSubtitle;
  isActive: boolean;
  isPlaying: boolean;
  currentTime: number;
  isLooping: boolean;
  isLoggedIn: boolean;
  visibilityMode: VisibilityMode;
  isProofreadingMode: boolean;
  fontSizeLevel: number;
  vocabWords: Set<string>;
  audioRef: HTMLAudioElement | null;
  onJump: (t: number) => void;
  onWordClick: (
    word: string,
    contextEn: string,
    contextCn: string,
    timestamp: number,
  ) => void;
  onToggleLoop: () => void;
  onProofread: (sub: ProcessedSubtitle) => void;
}

const SubtitleRow = React.memo(function SubtitleRow({
  sub,
  isActive,
  isPlaying,
  currentTime,
  isLooping,
  isLoggedIn,
  visibilityMode,
  isProofreadingMode,
  fontSizeLevel,
  vocabWords,
  audioRef,
  onJump,
  onWordClick,
  onToggleLoop,
  onProofread,
}: SubtitleRowProps) {
  const fontSize = FONT_SIZE_LEVELS[fontSizeLevel] ?? FONT_SIZE_LEVELS[1];
  const textRef = useRef<HTMLDivElement>(null);

  // 随语速线性过渡的扫光高亮（仅 active 播放行启动 rAF，命令式写 DOM）
  useWordHighlight({
    controller: {
      getTime: () => audioRef?.currentTime ?? -1,
      isPlaying: () => !!audioRef && !audioRef.paused,
    },
    containerRef: textRef,
    isHighlighted: isActive && isPlaying,
    words: sub.words,
    start: sub.start,
    end: sub.end,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "group relative flex items-start gap-2 md:gap-3 min-w-0 rounded-xl px-3 md:px-4 py-3 transition-colors duration-200 cursor-pointer border-l-[3px]",
        isActive
          ? "border-primary-500 bg-primary-500/[0.03] dark:bg-primary-500/[0.05]"
          : "border-transparent hover:bg-ink-50 dark:hover:bg-ink-900/40",
      )}
      id={`fct-sub-${sub.id}`}
      onClick={() => {
        if (!isActive) {
          const exactStart =
            sub.words && sub.words.length > 0 ? sub.words[0].start : sub.start;
          onJump(exactStart);
        }
      }}
    >
      {/* ── Time Rail ── */}
      <span
        className={cn(
          "w-9 shrink-0 pt-[3px] text-[12px] tabular-nums font-medium select-none transition-colors",
          isActive
            ? "text-primary-600 dark:text-primary-400 font-bold"
            : "text-ink-300 dark:text-ink-600 group-hover:text-primary-500 dark:group-hover:text-primary-400",
        )}
      >
        {formatSec(sub.start)}
      </span>

      {/* ── Text ── */}
      <div ref={textRef} className="flex-1 min-w-0 space-y-2">
        {(visibilityMode === "both" || visibilityMode === "en") && (
          <p
            className={cn(
              "font-serif tracking-wide break-words",
              fontSize.en,
              isActive
                ? "text-primary-600 dark:text-primary-400 font-bold"
                : "text-ink-800 dark:text-ink-200",
            )}
          >
            {sub.words && sub.words.length > 0
              ? sub.words.map((wordObj, i) => {
                  const cleanWord = wordObj.word
                    .replace(/[.,!?;:"'()[\]{}]/g, "")
                    .trim();
                  const isSaved = vocabWords.has(cleanWord.toLowerCase());
                  const isWordActive =
                    isActive &&
                    isPlaying &&
                    currentTime >= wordObj.start &&
                    currentTime <= wordObj.end;
                  return (
                    <span
                      key={i}
                      data-wi={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        const sel = window.getSelection();
                        if (sel && !sel.isCollapsed) return;
                        onWordClick(
                          cleanWord,
                          sub.textEn,
                          sub.textCn.replace(/\[SPEAKER_\d+\]:\s*/g, ""),
                          wordObj.start,
                        );
                      }}
                      className={cn(
                        "cursor-pointer rounded-[3px] inline-block active:scale-95 transition-colors select-text mr-1",
                        isWordActive
                          ? "bg-accent-100 dark:bg-accent-900/40"
                          : "hover:bg-accent-100 dark:hover:bg-accent-900/40 hover:text-accent-700 dark:hover:text-accent-300",
                        isSaved &&
                          "bg-accent-100/80 dark:bg-accent-900/50 text-accent-800 dark:text-accent-300",
                      )}
                      title={isSaved ? "已在生词本中" : undefined}
                    >
                      {wordObj.word}
                    </span>
                  );
                })
              : sub.textEn
                  .trim()
                  .split(/(\s+)/)
                  .map((part, i) => {
                    if (part.trim() === "") {
                      return (
                        <span key={i} className="inline select-text">
                          {part}
                        </span>
                      );
                    }
                    const cleanWord = part
                      .replace(/[.,!?;:"'()[\]{}]/g, "")
                      .trim();
                    const isSaved = vocabWords.has(cleanWord.toLowerCase());
                    return (
                      <span
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          const sel = window.getSelection();
                          if (sel && !sel.isCollapsed) return;
                          onWordClick(
                            cleanWord,
                            sub.textEn,
                            sub.textCn.replace(/\[SPEAKER_\d+\]:\s*/g, ""),
                            sub.start,
                          );
                        }}
                        className={cn(
                          "cursor-pointer rounded-[3px] inline transition-colors select-text hover:bg-accent-100 dark:hover:bg-accent-900/40 hover:text-accent-700 dark:hover:text-accent-300",
                          isSaved &&
                            "bg-accent-100/80 dark:bg-accent-900/50 text-accent-800 dark:text-accent-300",
                        )}
                        title={isSaved ? "已在生词本中" : undefined}
                      >
                        {part}
                      </span>
                    );
                  })}
          </p>
        )}
        {(visibilityMode === "both" || visibilityMode === "zh") && (
          <p
            className={cn(
              "font-sans break-words",
              fontSize.zh,
              isActive
                ? "text-ink-600 dark:text-ink-300"
                : "text-ink-400 dark:text-ink-500",
            )}
          >
            {sub.textCn.replace(/\[SPEAKER_\d+\]:\s*/g, "").trim()}
          </p>
        )}
      </div>

      {/* ── Sentence Actions ── */}
      <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
        {!isProofreadingMode ? (
          <>
            {/* Play this sentence */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onJump(sub.start);
              }}
              className="p-1.5 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 text-ink-300 dark:text-ink-600 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30"
              title="播放此句"
            >
              <span className="material-symbols-outlined text-lg">
                play_arrow
              </span>
            </button>
            {/* Loop Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleLoop();
              }}
              className={cn(
                "p-1.5 rounded-full transition-all duration-200",
                isActive
                  ? isLooping
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-primary-300 dark:text-primary-700 hover:text-primary-500 dark:hover:text-primary-400"
                  : "opacity-0 group-hover:opacity-100 text-ink-300 dark:text-ink-600 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30",
              )}
              title="单句循环 (R)"
            >
              <span
                className="material-symbols-outlined text-lg"
                style={{
                  fontVariationSettings: isLooping ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {isLooping ? "repeat_one" : "repeat"}
              </span>
            </button>
          </>
        ) : (
          /* Proofread Button */
          isLoggedIn &&
          onProofread && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onProofread(sub);
              }}
              className="p-1.5 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 text-ink-300 dark:text-ink-600 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30"
              title="校对字幕"
            >
              <PencilSquareIcon className="w-4 h-4" />
            </button>
          )
        )}
      </div>
    </motion.div>
  );
});

// ─── Settings Toggle Row ─────────────────────────────────────────────────────
function SettingsRow({
  icon,
  label,
  children,
  onClick,
}: {
  icon: string;
  label: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-2 rounded-xl",
        onClick &&
          "cursor-pointer hover:bg-ink-50 dark:hover:bg-ink-800/60 transition-colors",
      )}
    >
      <div className="flex items-center gap-2.5 text-sm text-ink-700 dark:text-ink-200">
        <span className="material-symbols-outlined text-lg text-ink-400 dark:text-ink-500">
          {icon}
        </span>
        {label}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "relative w-8 h-[18px] rounded-full transition-colors",
        checked ? "bg-primary-500" : "bg-ink-200 dark:bg-ink-700",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all",
          checked ? "left-[16px]" : "left-[2px]",
        )}
      />
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function FullContentTranscript({
  isOpen,
  onClose,
  subtitles,
  episode,
}: FullContentTranscriptProps) {
  const { data: session } = useSession();
  const router = useRouter();
  function formatTime(time: number) {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  const {
    currentEpisode,
    isPlaying,
    currentTime,
    duration,
    setCurrentTime,
    audioRef,
    pause,
    play,
    togglePlay,
    playNext,
    playPrevious,
    playbackRate,
    setPlaybackRate,
    loopMode,
    isShuffle,
    cyclePlayMode,
    transcriptMode,
    setTranscriptMode,
    isPlaylistOpen,
    setIsPlaylistOpen,
    setCurrentEpisode,
    setCurrentAudioUrl,
  } = usePlayerStore();

  const isPlayingThis = currentEpisode?.episodeid === episode.episodeid;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // ── States ──
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  const displayTime = isDragging ? dragTime : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsDragging(true);
    setDragTime(Number(e.target.value));
  };

  const handleSeekEnd = () => {
    if (audioRef) {
      audioRef.currentTime = dragTime;
      setCurrentTime(dragTime);
    }
    setIsDragging(false);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(next);
  };

  const [loopingIndex, setLoopingIndex] = useState<number | null>(null);
  const lastJumpTimeRef = useRef<number>(0);

  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>("both");
  const [isProofreadingMode, setIsProofreadingMode] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const saved = Number(window.localStorage.getItem(FONT_SIZE_STORAGE_KEY));
    return saved >= 0 && saved <= 2 ? saved : 1;
  });

  // Episode vocabulary (for learning panel)
  const [vocabList, setVocabList] = useState<EpisodeVocabItem[]>([]);
  // Global vocabulary words (for highlighting and preventing duplicate save)
  const [globalVocabWords, setGlobalVocabWords] = useState<Set<string>>(
    new Set(),
  );

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
  const [selectedTimestamp, setSelectedTimestamp] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dictData, setDictData] = useState<DictEntryDTO | null>(null);
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false);
  const [wasPlayingBeforeModal, setWasPlayingBeforeModal] = useState(false);

  // ── Processed subtitles ──
  const processed: ProcessedSubtitle[] = useMemo(() => {
    if (!Array.isArray(subtitles)) return [];
    return subtitles.map((item) => ({
      ...item,
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
    {
      transcriptMode,
      loopingIndex,
      lastJumpTimeRef,
    },
  );

  const { selectionMenu, setSelectionMenu } = useTranscriptSelection(
    scrollContainerRef,
    processed,
    "fct-sub-",
  );

  // ── Saved words set for highlight ──
  const vocabWords = useMemo(
    () => new Set(vocabList.map((v) => v.word.toLowerCase())),
    [vocabList],
  );

  // ── Fetch episode vocabulary & global vocabulary words ──
  useEffect(() => {
    if (!isOpen || !isLoggedIn) {
      setVocabList([]);
      setGlobalVocabWords(new Set());
      return;
    }
    let cancelled = false;

    // 获取本集生词 (用于学习面板)
    fetch(`/api/vocabulary/list?episodeid=${episode.episodeid}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.success && Array.isArray(d.data)) {
          setVocabList(d.data);
        }
      })
      .catch(() => {});

    // 获取全局已收藏单词 (用于高亮和去重限制)
    fetch(`/api/vocabulary/words`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.success && Array.isArray(d.data)) {
          setGlobalVocabWords(new Set(d.data));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isOpen, isLoggedIn, episode.episodeid]);

  // ── Resume playback after closing Vocabulary Modal ──
  useEffect(() => {
    if (!isModalOpen && wasPlayingBeforeModal) {
      if (play) play();
      setWasPlayingBeforeModal(false);
    }
  }, [isModalOpen, wasPlayingBeforeModal, play]);

  // ── Persist font size ──
  useEffect(() => {
    window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(fontSizeLevel));
  }, [fontSizeLevel]);

  // ── Settings dropdown click-outside ──
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(e.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSettingsOpen]);

  // ── Dictation Mode Logic ──
  useEffect(() => {
    if (transcriptMode === "dictate") {
      setPlaybackRate(0.8);
    } else {
      setPlaybackRate(1.0);
    }
  }, [transcriptMode, setPlaybackRate]);

  const handleDictationSuccess = useCallback(() => {
    lastJumpTimeRef.current = Date.now();
    const nextSub = processed[activeIndex + 1];
    if (nextSub && audioRef) {
      audioRef.currentTime = nextSub.start;
      setCurrentTime(nextSub.start);
    } else if (pause) {
      pause();
    }
  }, [activeIndex, processed, audioRef, setCurrentTime, pause]);

  // ── Handlers ──
  const handleJump = useCallback(
    (t: number) => {
      lastJumpTimeRef.current = Date.now();
      setSelectionMenu((prev) => ({ ...prev, visible: false }));
      if (!checkExclusivePlay(episode, session)) return;

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
      session,
      setSelectionMenu,
    ],
  );

  const jumpBySentence = useCallback(
    (delta: number) => {
      if (transcriptMode === "dictate" || processed.length === 0) return;
      const base = activeIndex >= 0 ? activeIndex : 0;
      const target = processed[base + delta];
      if (target) handleJump(target.start);
    },
    [transcriptMode, processed, activeIndex, handleJump],
  );

  const keyboardHandlers = useMemo(
    () => ({
      onTogglePlay: () => {
        if (isPlayingThis) {
          togglePlay();
        } else {
          handleJump(processed[activeIndex]?.start ?? 0);
        }
      },
      onPrevSentence: () => jumpBySentence(-1),
      onNextSentence: () => jumpBySentence(1),
      onToggleLoopCurrent: () => {
        if (activeIndex >= 0) {
          setLoopingIndex((prev) =>
            prev === activeIndex ? null : activeIndex,
          );
        }
      },
      onClose,
    }),
    [
      isPlayingThis,
      togglePlay,
      handleJump,
      processed,
      activeIndex,
      jumpBySentence,
      onClose,
    ],
  );
  useTranscriptKeyboard(
    isOpen && !isModalOpen && !isProofreadOpen,
    keyboardHandlers,
  );

  const handleWordClick = useCallback(
    async (
      word: string,
      contextEn: string,
      contextCn: string,
      timestamp: number,
    ) => {
      setSelectionMenu((prev) => ({ ...prev, visible: false }));

      if (isPlayingThis && isPlaying) {
        setWasPlayingBeforeModal(true);
        if (pause) pause();
      } else {
        setWasPlayingBeforeModal(false);
      }

      const cleanWord = word.replace(/[.,!?;:"()]/g, "").trim();
      if (!cleanWord) return;

      setSelectedWord(cleanWord);
      setSelectedContext(contextEn);
      setSelectedTranslation(contextCn);
      setSelectedTimestamp(timestamp);
      setDictData(null);
      setIsModalOpen(true);
      setIsLoadingDefinition(true);

      try {
        const res = await fetch(
          `/api/dict/${encodeURIComponent(cleanWord.toLowerCase())}`,
        );
        if (res.ok) {
          const json = await res.json();
          if (handleDictionaryQuotaBlock(json)) return;
          if (json.success && json.data) {
            setDictData(json.data as DictEntryDTO);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingDefinition(false);
      }
    },
    [isPlayingThis, isPlaying, pause, setSelectionMenu],
  );

  const handleSaveVocabulary = async () => {
    if (!selectedWord) return;

    if (!session?.user) {
      toast.error("请先登录后再保存生词");
      return;
    }

    // Derive definition from dictData
    const definition =
      dictData?.definitions
        ?.map((d) => `[${d.pos}] ${d.meaning_cn}`)
        .join("; ") || "";

    setIsSaving(true);

    try {
      const res = await fetch("/api/vocabulary/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: selectedWord,
          definition,
          contextSentence: selectedContext,
          translation: selectedTranslation,
          episodeid: episode.episodeid,
          timestamp: selectedTimestamp,
          speakUrl: dictData?.audio_urls?.us || "",
          dictUrl: "",
          webUrl: "",
          mobileUrl: "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "已加入生词本");
        if (data?.data) {
          setVocabList((prev) => {
            const exists = prev.some(
              (v) => v.vocabularyid === data.data.vocabularyid,
            );
            return exists ? prev : [...prev, data.data];
          });
          setGlobalVocabWords((prev) => {
            const newSet = new Set(prev);
            newSet.add(data.data.word.toLowerCase());
            return newSet;
          });
        }
        setIsModalOpen(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.message || "保存失败");
      }
    } catch (error) {
      console.error(error);
      toast.error("网络错误");
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewDetail = useCallback(() => {
    onClose();
    router.push(`/episode/${episode.episodeid}`);
  }, [onClose, router, episode.episodeid]);

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
          className="fixed inset-0 z-[200] bg-white/95 dark:bg-ink-950/95 backdrop-blur-xl flex flex-col md:flex-row md:portrait:flex-col overflow-hidden"
        >
          {/* ── Master Panel (Tablet & Desktop) ── */}
          <div
            className="hidden md:flex flex-col bg-white/90 dark:bg-ink-900/90 backdrop-blur-xl border-ink-200 dark:border-ink-800 shrink-0
                          w-full md:w-[35%] md:max-w-[400px] xl:max-w-[480px] h-full border-r
                          md:portrait:hidden"
          >
            {/* Top Bar for Master Panel (Close button, Info) */}
            <div className="flex items-center justify-between px-4 md:px-6 h-14 shrink-0">
              <button
                onClick={onClose}
                className="flex items-center gap-1 px-2 py-1.5 -ml-2 rounded-xl text-ink-500 hover:text-primary-600 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
                title="收起 (Esc)"
              >
                <span className="material-symbols-outlined text-xl">
                  expand_more
                </span>
                <span className="text-sm font-bold">返回</span>
              </button>
            </div>

            {/* Cover & Title */}
            <div className="px-6 pb-4 flex flex-col md:portrait:flex-row gap-4 md:portrait:items-center shrink-0 border-b border-ink-100 dark:border-ink-800/50">
              <div
                className="w-full md:portrait:w-20 md:portrait:h-20 aspect-video md:portrait:aspect-square rounded-xl shadow-lg border border-ink-200 dark:border-ink-700 overflow-hidden shrink-0 cursor-pointer"
                onClick={handleViewDetail}
              >
                <img
                  src={episode.coverUrl}
                  className="w-full h-full object-cover"
                  alt="Cover"
                />
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <h2 className="text-xl md:portrait:text-base font-bold text-ink-900 dark:text-ink-50 line-clamp-2 leading-snug">
                  {episode.title}
                </h2>
                <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mt-1">
                  {episode.podcast?.title}
                </p>
              </div>
            </div>

            {/* Player Controls */}
            <div className="px-6 py-5 flex flex-col gap-5 shrink-0 border-b border-ink-100 dark:border-ink-800/50">
              {/* Progress */}
              <div className="flex flex-col gap-2">
                <div className="relative h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full group">
                  <div
                    className="absolute left-0 top-0 h-full bg-primary-600 rounded-full transition-all duration-150"
                    style={{
                      width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                    }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-primary-600 rounded-full shadow-sm" />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={(e) => {
                      const t = parseFloat(e.target.value);
                      if (audioRef) audioRef.currentTime = t;
                      setCurrentTime(t);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-xs font-mono font-medium text-ink-400">
                  <span>{formatSec(currentTime)}</span>
                  <span>-{formatSec(duration - currentTime)}</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    const rates = [1, 1.25, 1.5, 2, 0.75];
                    const next =
                      rates[(rates.indexOf(playbackRate) + 1) % rates.length];
                    setPlaybackRate(next);
                  }}
                  className="w-10 h-10 rounded-full bg-base-200 dark:bg-ink-800 text-ink-600 dark:text-ink-300 font-bold text-xs hover:bg-base-300 transition-colors"
                >
                  {playbackRate}x
                </button>
                <div className="flex items-center gap-5">
                  <button
                    onClick={() => {
                      const t = Math.max(0, currentTime - 5);
                      if (audioRef) audioRef.currentTime = t;
                      setCurrentTime(t);
                    }}
                    className="text-ink-600 dark:text-ink-300 active:scale-90 transition-transform"
                  >
                    <span className="material-symbols-outlined text-3xl">
                      replay_5
                    </span>
                  </button>
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                  >
                    <span
                      className="material-symbols-outlined text-3xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {isPlaying ? "pause" : "play_arrow"}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      const t = Math.max(0, currentTime + 5);
                      if (audioRef) audioRef.currentTime = t;
                      setCurrentTime(t);
                    }}
                    className="text-ink-600 dark:text-ink-300 active:scale-90 transition-transform"
                  >
                    <span className="material-symbols-outlined text-3xl">
                      forward_5
                    </span>
                  </button>
                </div>
                <div className="flex items-center gap-2 relative">
                  <button
                    onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isPlaylistOpen
                        ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                        : "bg-base-200 dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-base-300 dark:hover:bg-ink-700"
                    }`}
                    title="播放列表"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      playlist_play
                    </span>
                  </button>
                  <button
                    onClick={cyclePlayMode}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isShuffle || loopMode !== "none"
                        ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                        : "bg-base-200 dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-base-300 dark:hover:bg-ink-700"
                    }`}
                    title={
                      isShuffle
                        ? "随机播放"
                        : loopMode === "none"
                          ? "不循环"
                          : loopMode === "all"
                            ? "列表循环"
                            : "单曲循环"
                    }
                  >
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={{
                        fontVariationSettings:
                          isShuffle || loopMode !== "none"
                            ? "'FILL' 1"
                            : "'FILL' 0",
                      }}
                    >
                      {isShuffle
                        ? "shuffle"
                        : loopMode === "one"
                          ? "repeat_one"
                          : "repeat"}
                    </span>
                  </button>

                  {/* Playlist Dropdown for FullContentTranscript */}
                  <PlaylistDropdown className="absolute bottom-full left-0 mb-4 w-72 max-h-[400px]" />
                </div>
              </div>
            </div>

            {/* Vocab List (Only in Landscape) */}
            <div className="hidden md:flex md:portrait:hidden flex-col flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
              <h3 className="text-sm font-bold text-ink-800 dark:text-ink-200 mb-4 flex items-center gap-2">
                <span>🧠</span> 本集生词
              </h3>
              <div className="flex flex-col gap-3">
                {vocabList.slice(0, 15).map((v) => (
                  <div
                    key={v.word}
                    className="bg-white dark:bg-ink-800/50 rounded-xl p-3 shadow-sm border border-ink-100 dark:border-ink-700/50 cursor-pointer hover:border-primary-300 transition-colors"
                    onClick={() =>
                      handleWordClick(
                        v.word,
                        v.contextSentence || "",
                        v.translation || "",
                        v.timestamp || 0,
                      )
                    }
                  >
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="font-bold text-ink-900 dark:text-ink-100 text-[15px]">
                        {v.word}
                      </span>
                    </div>
                    <div className="text-[13px] text-ink-500 dark:text-ink-400 line-clamp-1">
                      {v.definition}
                    </div>
                  </div>
                ))}
                {vocabList.length === 0 && (
                  <div className="text-center py-6 text-sm text-ink-400">
                    本集暂无推荐生词
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Main Content Canvas ── */}
          <main
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto scrollbar-none bg-white/50 dark:bg-ink-950/50 relative md:portrait:pb-24"
          >
            {/* Toolbar (Mode Switcher & Settings) - Floats at the top of detail panel */}
            <div className="hidden md:flex sticky top-0 z-40 bg-white/90 dark:bg-ink-950/90 backdrop-blur-md border-b border-ink-200 dark:border-ink-800 px-4 py-2 items-center justify-between shadow-sm">
              <div className="flex bg-ink-100 dark:bg-ink-800 rounded-lg p-1">
                <button
                  onClick={() => setTranscriptMode("read")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                    transcriptMode === "read"
                      ? "bg-white dark:bg-ink-700 text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-ink-500 dark:text-ink-400"
                  }`}
                >
                  📖 精读
                </button>
                <button
                  onClick={() => setTranscriptMode("dictate")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                    transcriptMode === "dictate"
                      ? "bg-white dark:bg-ink-700 text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-ink-500 dark:text-ink-400"
                  }`}
                >
                  ✍️ 听写
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 bg-ink-100 dark:bg-ink-800 rounded-lg p-1">
                  {(["both", "en", "zh"] as VisibilityMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setVisibilityMode(mode)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                        visibilityMode === mode
                          ? "bg-white dark:bg-ink-700 text-primary-600 dark:text-primary-400 shadow-sm"
                          : "text-ink-500 dark:text-ink-400"
                      }`}
                    >
                      {mode === "both" ? "双语" : mode === "en" ? "英" : "中"}
                    </button>
                  ))}
                </div>

                {/* Settings dropdown */}
                <div className="relative" ref={settingsRef}>
                  <button
                    onClick={() => setIsSettingsOpen((v) => !v)}
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-xl transition-colors",
                      isSettingsOpen
                        ? "bg-ink-100 dark:bg-ink-800 text-primary-600 dark:text-primary-400"
                        : "text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-ink-100 dark:hover:bg-ink-800",
                    )}
                    title="设置"
                  >
                    <span className="material-symbols-outlined text-xl">
                      settings
                    </span>
                  </button>

                  {isSettingsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 shadow-e3 p-1.5 z-50">
                      <SettingsRow
                        icon={autoScroll ? "sync" : "sync_disabled"}
                        label="自动滚动"
                        onClick={() => setAutoScroll(!autoScroll)}
                      >
                        <Toggle checked={autoScroll} />
                      </SettingsRow>

                      <div className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="flex items-center gap-2.5 text-sm text-ink-700 dark:text-ink-200">
                          <span className="material-symbols-outlined text-lg text-ink-400 dark:text-ink-500">
                            format_size
                          </span>
                          字幕字号
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setFontSizeLevel((v) => Math.max(0, v - 1))
                            }
                            disabled={fontSizeLevel === 0}
                            className="w-7 h-7 rounded-lg text-xs font-bold text-ink-500 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 disabled:opacity-30 transition-colors"
                            title="减小字号"
                          >
                            A-
                          </button>
                          <span className="w-4 text-center text-xs tabular-nums text-ink-400">
                            {fontSizeLevel + 1}
                          </span>
                          <button
                            onClick={() =>
                              setFontSizeLevel((v) => Math.min(2, v + 1))
                            }
                            disabled={fontSizeLevel === 2}
                            className="w-7 h-7 rounded-lg text-sm font-bold text-ink-500 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 disabled:opacity-30 transition-colors"
                            title="增大字号"
                          >
                            A+
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="flex items-center gap-2.5 text-sm text-ink-700 dark:text-ink-200">
                          <span className="material-symbols-outlined text-lg text-ink-400 dark:text-ink-500">
                            contrast
                          </span>
                          深浅色
                        </div>
                        <ThemeSwitcher className="flex items-center justify-center w-8 h-8 rounded-xl text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors" />
                      </div>

                      {isLoggedIn && (
                        <>
                          <div className="my-1 h-px bg-ink-100 dark:bg-ink-800" />
                          <SettingsRow
                            icon="edit"
                            label="字幕校对"
                            onClick={() => {
                              setIsProofreadingMode(!isProofreadingMode);
                              setIsSettingsOpen(false);
                            }}
                          >
                            <span
                              className={cn(
                                "text-[11px] font-bold",
                                isProofreadingMode
                                  ? "text-accent-600 dark:text-accent-400"
                                  : "text-ink-300 dark:text-ink-600",
                              )}
                            >
                              {isProofreadingMode ? "开启中" : "关闭"}
                            </span>
                          </SettingsRow>
                        </>
                      )}

                      <div className="my-1 h-px bg-ink-100 dark:bg-ink-800" />
                      <p className="px-3 py-1.5 text-[11px] leading-relaxed text-ink-400 dark:text-ink-500">
                        Space 播放 · ←/→ 句跳 · R 单句循环 · Esc 收起
                      </p>
                      <p className="px-3 pb-1.5 text-[11px] text-ink-300 dark:text-ink-600">
                        注:AI 翻译仅供参考
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="max-w-[800px] mx-auto px-3 sm:px-4 md:px-8 py-4 md:py-6 space-y-6">
              <AnimatePresence>
                {processed.map((sub, index) => {
                  const isActive = index === activeIndex;
                  if (transcriptMode === "dictate" && isActive) {
                    return (
                      <DictationItem
                        key={sub.id || index}
                        sub={sub}
                        isActive={isActive}
                        isPlaying={isPlaying}
                        showTranslation={
                          visibilityMode === "zh" || visibilityMode === "both"
                        }
                        onJump={handleJump}
                        onSuccess={handleDictationSuccess}
                      />
                    );
                  }
                  return (
                    <SubtitleRow
                      key={sub.id || index}
                      sub={sub}
                      isActive={isActive}
                      isPlaying={isPlaying}
                      currentTime={currentTime}
                      isLooping={loopingIndex === index}
                      isLoggedIn={isLoggedIn}
                      visibilityMode={visibilityMode}
                      isProofreadingMode={isProofreadingMode}
                      fontSizeLevel={fontSizeLevel}
                      vocabWords={vocabWords}
                      audioRef={audioRef}
                      onJump={handleJump}
                      onWordClick={(word, en, zh, timestamp) =>
                        handleWordClick(word, en, zh, timestamp)
                      }
                      onToggleLoop={() =>
                        setLoopingIndex((prev) =>
                          prev === index ? null : index,
                        )
                      }
                      onProofread={(sub) => {
                        if (!session?.user) {
                          toast("请先登录", {
                            description: "登录后即可参与字幕校对共建！",
                          });
                          const loginModal = document.getElementById(
                            "email_check_modal_box",
                          ) as HTMLDialogElement | null;
                          if (loginModal) loginModal.showModal();
                          return;
                        }
                        setProofreadSub(sub);
                        setIsProofreadOpen(true);
                      }}
                    />
                  );
                })}
              </AnimatePresence>
              {!isLoggedIn && (
                <div className="flex justify-center mt-12 mb-8 relative z-10">
                  <button
                    onClick={() => {
                      const modal = document.getElementById(
                        "email_check_modal_box",
                      ) as HTMLDialogElement | null;
                      if (modal) modal.showModal();
                    }}
                    className="btn btn-primary rounded-full px-8 shadow-lg hover:shadow-xl transition-all font-medium"
                  >
                    登录后解锁全部字幕
                  </button>
                </div>
              )}
              <div className="h-40" />
              {/* Bottom spacer for PlayControlBar */}
            </div>
          </main>

          {/* Background Decoration */}
          <div className="fixed inset-0 -z-10 flex items-center justify-center opacity-[0.03] dark:opacity-[0.05] pointer-events-none text-ink-900 dark:text-ink-700">
            <span className="material-symbols-outlined text-[400px]">
              menu_book
            </span>
          </div>

          {/* ── Portrait Mini Player (Tablet Portrait Only) ── */}
          <div
            className="absolute bottom-4 left-4 right-4 h-[56px] bg-base-100/95 dark:bg-ink-900/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-base-200 dark:border-ink-800 flex items-center px-4 z-40 cursor-pointer overflow-hidden pb-safe-offset hidden md:portrait:flex"
            onClick={() => setIsPlayerExpanded(true)}
          >
            {/* Mini Progress Bar */}
            <div className="absolute top-0 left-0 h-0.5 bg-ink-100 dark:bg-ink-800 w-full">
              <div
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Info */}
            <div className="flex flex-col flex-1 min-w-0 mr-3">
              <div className="text-sm font-bold text-ink-900 dark:text-ink-50 truncate leading-tight">
                {episode.title}
              </div>
              <div className="text-[11px] text-ink-400 dark:text-ink-500 font-mono font-medium mt-0.5">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="w-10 h-10 flex items-center justify-center bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full transition-transform active:scale-95"
              >
                <span
                  className="material-symbols-outlined text-xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {isPlaying ? "pause" : "play_arrow"}
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playNext();
                }}
                className="w-10 h-10 flex items-center justify-center text-ink-500 dark:text-ink-400 transition-transform active:scale-95"
              >
                <span className="material-symbols-outlined text-xl">
                  skip_next
                </span>
              </button>
            </div>
          </div>

          {/* ── Expanded Bottom Sheet Player (Tablet Portrait Only) ── */}
          <AnimatePresence>
            {isPlayerExpanded && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 100) setIsPlayerExpanded(false);
                }}
                className="absolute inset-x-0 bottom-0 top-[50%] bg-base-100 dark:bg-ink-950 z-50 rounded-t-3xl shadow-[0_-10px_40px_rgb(0,0,0,0.1)] flex flex-col border-t border-base-200 dark:border-ink-800 md:hidden md:portrait:flex"
              >
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                  <div className="w-12 h-1.5 rounded-full bg-ink-200 dark:bg-ink-700" />
                </div>

                <div className="flex-1 flex flex-col px-6 pt-4 pb-12 overflow-y-auto">
                  <div
                    className="w-full max-w-[320px] mx-auto aspect-[16/9] rounded-2xl shadow-xl mb-8 overflow-hidden border border-ink-100 dark:border-ink-800 shrink-0 cursor-pointer transition-transform active:scale-95 hover:shadow-2xl"
                    onClick={() => {
                      onClose();
                      router.push(`/episode/${episode.episodeid}`);
                    }}
                  >
                    <img
                      src={episode.coverUrl}
                      className="w-full h-full object-cover"
                      alt="Cover"
                    />
                  </div>

                  <div className="text-center mb-8 shrink-0">
                    <h2 className="text-xl font-bold text-ink-900 dark:text-ink-50 mb-1.5 line-clamp-2 leading-snug">
                      {episode.title}
                    </h2>
                    <p className="text-sm font-medium text-primary-600 dark:text-primary-400 truncate">
                      {episode.podcast?.title}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex flex-col gap-3 mb-8 shrink-0">
                    <div className="relative h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full group">
                      <div
                        className="absolute left-0 top-0 h-full bg-primary-600 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary-600 rounded-full shadow-sm" />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={displayTime}
                        onChange={handleSeekChange}
                        onMouseUp={handleSeekEnd}
                        onTouchEnd={handleSeekEnd}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-medium text-ink-400 font-mono">
                      <span>{formatTime(displayTime)}</span>
                      <span>-{formatTime(duration - displayTime)}</span>
                    </div>
                  </div>

                  {/* Big Controls */}
                  <div className="flex items-center justify-between mb-8 shrink-0">
                    <button
                      onClick={cyclePlaybackRate}
                      className="w-12 h-12 rounded-full bg-base-200 dark:bg-ink-800 text-ink-600 dark:text-ink-300 font-bold text-sm"
                    >
                      {playbackRate}x
                    </button>
                    <div className="flex items-center gap-6">
                      <button
                        onClick={playPrevious}
                        className="text-ink-700 dark:text-ink-300 active:scale-90 transition-transform"
                      >
                        <span className="material-symbols-outlined text-4xl">
                          skip_previous
                        </span>
                      </button>
                      <button
                        onClick={togglePlay}
                        className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-primary-600/30 active:scale-90 transition-transform"
                      >
                        <span
                          className="material-symbols-outlined text-4xl"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          {isPlaying ? "pause" : "play_arrow"}
                        </span>
                      </button>
                      <button
                        onClick={playNext}
                        className="text-ink-700 dark:text-ink-300 active:scale-90 transition-transform"
                      >
                        <span className="material-symbols-outlined text-4xl">
                          skip_next
                        </span>
                      </button>
                    </div>
                    <button
                      onClick={cyclePlayMode}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                        isShuffle || loopMode !== "none"
                          ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                          : "bg-base-200 dark:bg-ink-800 text-ink-600 dark:text-ink-300"
                      }`}
                      title={
                        isShuffle
                          ? "随机播放"
                          : loopMode === "none"
                            ? "不循环"
                            : loopMode === "all"
                              ? "列表循环"
                              : "单曲循环"
                      }
                    >
                      <span
                        className="material-symbols-outlined text-xl"
                        style={{
                          fontVariationSettings:
                            isShuffle || loopMode !== "none"
                              ? "'FILL' 1"
                              : "'FILL' 0",
                        }}
                      >
                        {isShuffle
                          ? "shuffle"
                          : loopMode === "one"
                            ? "repeat_one"
                            : "repeat"}
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <SelectionMenu
            menuRef={menuRef}
            selectionMenu={selectionMenu}
            onClose={() =>
              setSelectionMenu((prev) => ({ ...prev, visible: false }))
            }
            onWordClick={handleWordClick}
          />

          <VocabularyModal
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            selectedWord={selectedWord}
            dictData={dictData}
            isLoadingDefinition={isLoadingDefinition}
            isSaving={isSaving}
            isSaved={globalVocabWords.has(selectedWord.toLowerCase())}
            episodeTitle={episode.title}
            onSave={handleSaveVocabulary}
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
