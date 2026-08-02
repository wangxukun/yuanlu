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
import { parseTimeStr } from "@/lib/tools";
import { checkExclusivePlay } from "@/lib/client/auth-utils";
import { MergedSubtitleItem, ProcessedSubtitle } from "./transcript/types";
import { ProofreadModal } from "./transcript/ProofreadModal";
import { VocabularyModal } from "./transcript/VocabularyModal";
import { SelectionMenu } from "./transcript/SelectionMenu";
import { useTranscriptSelection } from "./transcript/useTranscriptSelection";
import { useTranscriptKeyboard } from "./transcript/useTranscriptKeyboard";
import LearningPanel, { EpisodeVocabItem } from "./transcript/LearningPanel";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import ThemeSwitcher from "@/components/theme-switcher";
import { useTranscriptScroll } from "./transcript/useTranscriptScroll";
import { DictationItem } from "./transcript/DictationItem";
import type { DictEntryDTO } from "@/core/dictionary/dto";

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

// ─── Font Size Levels ────────────────────────────────────────────────────────
const FONT_SIZE_LEVELS = [
  {
    en: "text-[15px] sm:text-base leading-[1.65]",
    zh: "text-xs leading-[1.6]",
  },
  { en: "text-base sm:text-lg leading-[1.7]", zh: "text-[13px] leading-[1.6]" },
  { en: "text-lg sm:text-xl leading-[1.8]", zh: "text-sm leading-[1.65]" },
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
  isLooping: boolean;
  isLoggedIn: boolean;
  visibilityMode: VisibilityMode;
  isProofreadingMode: boolean;
  fontSizeLevel: number;
  vocabWords: Set<string>;
  onJump: (t: number) => void;
  onWordClick: (
    word: string,
    contextEn: string,
    contextZh: string,
    timestamp: number,
  ) => void;
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
  fontSizeLevel,
  vocabWords,
  onJump,
  onWordClick,
  onToggleLoop,
  onProofread,
}: SubtitleRowProps) {
  const fontSize = FONT_SIZE_LEVELS[fontSizeLevel] ?? FONT_SIZE_LEVELS[1];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "group relative flex items-start gap-2 md:gap-3 rounded-lg px-2.5 md:px-3 py-2.5 transition-colors duration-200 cursor-pointer",
        isActive
          ? "bg-primary-50/80 dark:bg-primary-900/20"
          : "hover:bg-ink-50 dark:hover:bg-ink-900/40",
      )}
      id={`fct-sub-${sub.id}`}
      onClick={() => {
        if (!isActive) onJump(sub.start);
      }}
    >
      {/* Active indicator bar */}
      <span
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 h-3/5 w-[3px] rounded-full bg-primary-500 transition-opacity duration-200",
          isActive ? "opacity-100" : "opacity-0",
        )}
      />

      {/* ── Time Rail ── */}
      <span
        className={cn(
          "w-9 shrink-0 pt-[5px] text-[11px] tabular-nums font-medium select-none transition-colors",
          isActive
            ? "text-primary-600 dark:text-primary-400 font-bold"
            : "text-ink-300 dark:text-ink-600 group-hover:text-primary-500 dark:group-hover:text-primary-400",
        )}
      >
        {formatSec(sub.start)}
      </span>

      {/* ── Text ── */}
      <div className="flex-1 min-w-0 space-y-1">
        {(visibilityMode === "both" || visibilityMode === "en") && (
          <p
            className={cn(
              "font-serif tracking-wide",
              fontSize.en,
              isActive
                ? "text-primary-950 dark:text-primary-50 font-semibold"
                : "text-ink-700 dark:text-ink-200",
            )}
          >
            {sub.textEn
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
                const cleanWord = part.replace(/[.,!?;:"'()[\]{}]/g, "").trim();
                const isSaved = vocabWords.has(cleanWord.toLowerCase());
                return (
                  <span
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      const sel = window.getSelection();
                      if (sel && !sel.isCollapsed) return;
                      onWordClick(cleanWord, sub.textEn, sub.textZh, sub.start);
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
              "font-sans",
              fontSize.zh,
              isActive
                ? "text-ink-600 dark:text-ink-300"
                : "text-ink-400 dark:text-ink-500",
            )}
          >
            {sub.textZh.trim()}
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
  const {
    currentTime,
    duration,
    setCurrentTime,
    audioRef,
    pause,
    play,
    togglePlay,
    isPlaying,
    currentEpisode,
    setCurrentEpisode,
    setCurrentAudioUrl,
    setPlaybackRate,
    transcriptMode,
    setTranscriptMode,
  } = usePlayerStore();

  const isPlayingThis = currentEpisode?.episodeid === episode.episodeid;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // ── States ──
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

  // Episode vocabulary (for highlight + learning panel)
  const [vocabList, setVocabList] = useState<EpisodeVocabItem[]>([]);
  const [isVocabLoading, setIsVocabLoading] = useState(false);

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

  // ── Fetch episode vocabulary ──
  useEffect(() => {
    if (!isOpen || !isLoggedIn) {
      setVocabList([]);
      return;
    }
    let cancelled = false;
    setIsVocabLoading(true);
    fetch(`/api/vocabulary/list?episodeid=${episode.episodeid}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.success && Array.isArray(d.data)) {
          setVocabList(d.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsVocabLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, isLoggedIn, episode.episodeid]);

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
      contextZh: string,
      timestamp: number,
    ) => {
      setSelectionMenu((prev) => ({ ...prev, visible: false }));

      if (isPlayingThis && isPlaying && pause) pause();

      const cleanWord = word.replace(/[.,!?;:"()]/g, "").trim();
      if (!cleanWord) return;

      setSelectedWord(cleanWord);
      setSelectedContext(contextEn);
      setSelectedTranslation(contextZh);
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
          className="fixed inset-0 z-[200] bg-white/95 dark:bg-ink-950/95 backdrop-blur-xl flex flex-col overflow-hidden"
        >
          {/* ── Header: 三段式 slim bar ── */}
          <header className="w-full shrink-0 bg-white/80 dark:bg-ink-900/80 border-b border-ink-200 dark:border-ink-800 z-10 transition-colors duration-300">
            <div className="relative flex items-center justify-between gap-3 h-14 px-3 md:px-6">
              {/* ── Left: 收起 + 剧集信息 ── */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={onClose}
                  className="flex items-center gap-0.5 shrink-0 px-2 py-1.5 -ml-1 rounded-xl text-ink-500 dark:text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
                  title="收起 (Esc)"
                >
                  <span className="material-symbols-outlined text-xl">
                    expand_more
                  </span>
                  <span className="text-xs font-bold hidden md:inline">
                    返回
                  </span>
                </button>
                <span className="hidden md:block w-px h-5 bg-ink-200 dark:bg-ink-700 shrink-0" />
                <div
                  className="hidden md:flex items-center gap-2.5 min-w-0 cursor-pointer group"
                  onClick={handleViewDetail}
                  title="查看剧集详情"
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-ink-200 dark:border-ink-700">
                    <img
                      src={episode.coverUrl}
                      alt={episode.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[13px] font-bold text-ink-900 dark:text-ink-100 truncate leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors max-w-[280px] lg:max-w-[360px]">
                      {episode.title}
                    </h2>
                    <p className="text-[11px] text-ink-400 dark:text-ink-500 truncate leading-tight">
                      {episode.podcast?.title || "未知节目"}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Center: 进度上下文 ── */}
              <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-2 text-xs text-ink-400 dark:text-ink-500 select-none pointer-events-none">
                <span className="tabular-nums font-medium">
                  第 {activeIndex >= 0 ? activeIndex + 1 : "–"}/
                  {processed.length} 句
                </span>
                <span className="w-px h-3 bg-ink-200 dark:bg-ink-700" />
                <span className="tabular-nums font-medium">
                  {formatSec(currentTime)} / {formatSec(duration)}
                </span>
              </div>

              {/* ── Right: 显示模式 / 听写 / 设置 / 关闭 ── */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Visibility segmented control */}
                <div className="flex items-center bg-ink-100/80 dark:bg-ink-800/80 backdrop-blur-sm p-0.5 rounded-xl gap-0.5 border border-ink-200/50 dark:border-ink-700/50">
                  {(
                    [
                      {
                        mode: "both",
                        icon: "translate",
                        label: "双语",
                        tip: "显示中英双语",
                      },
                      {
                        mode: "en",
                        icon: "abc",
                        label: "英文",
                        tip: "仅显示英文",
                      },
                      {
                        mode: "zh",
                        icon: "text_fields",
                        label: "中文",
                        tip: "仅显示中文",
                      },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.mode}
                      onClick={() => setVisibilityMode(item.mode)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200",
                        visibilityMode === item.mode
                          ? "bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm"
                          : "text-ink-500 dark:text-ink-400 hover:text-primary-500 dark:hover:text-primary-300",
                      )}
                      title={item.tip}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {item.icon}
                      </span>
                      <span className="hidden md:inline">{item.label}</span>
                    </button>
                  ))}
                </div>

                {/* Dictation mode (emphasized mode entry) */}
                <button
                  onClick={() =>
                    setTranscriptMode(
                      transcriptMode === "read" ? "dictate" : "read",
                    )
                  }
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200",
                    transcriptMode === "dictate"
                      ? "bg-primary-600 border-primary-600 text-white shadow-sm"
                      : "border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30",
                  )}
                  title={
                    transcriptMode === "dictate"
                      ? "退出听写模式"
                      : "进入听写模式"
                  }
                >
                  <span className="material-symbols-outlined text-sm">
                    {transcriptMode === "dictate"
                      ? "edit_note"
                      : "edit_document"}
                  </span>
                  <span className="hidden sm:inline">
                    {transcriptMode === "dictate" ? "听写中" : "听写"}
                  </span>
                </button>

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

                {/* Close */}
                <button
                  onClick={onClose}
                  className="flex items-center justify-center w-8 h-8 rounded-xl text-ink-400 hover:text-error-500 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
                  title="关闭 (Esc)"
                >
                  <span className="material-symbols-outlined text-xl">
                    close
                  </span>
                </button>
              </div>
            </div>
          </header>

          {/* ── Main Content Canvas ── */}
          <main
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto scrollbar-none bg-white/50 dark:bg-ink-950/50"
          >
            <div className="max-w-[1400px] mx-auto px-3 sm:px-4 md:px-8 py-4 md:py-6 grid grid-cols-12 gap-8">
              {/* Transcript column */}
              <div className="col-span-12 xl:col-span-8">
                <div className="max-w-[760px] mx-auto space-y-0.5">
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
                              visibilityMode === "zh" ||
                              visibilityMode === "both"
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
                          isLooping={loopingIndex === index}
                          isLoggedIn={isLoggedIn}
                          visibilityMode={visibilityMode}
                          isProofreadingMode={isProofreadingMode}
                          fontSizeLevel={fontSizeLevel}
                          vocabWords={vocabWords}
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
              </div>

              {/* Learning panel column */}
              <aside className="hidden xl:block xl:col-span-4">
                <LearningPanel
                  episode={episode}
                  vocabulary={vocabList}
                  isLoading={isVocabLoading}
                  isLoggedIn={isLoggedIn}
                  onWordClick={handleWordClick}
                  onJump={handleJump}
                  onViewDetail={handleViewDetail}
                />
              </aside>
            </div>
          </main>

          {/* Background Decoration */}
          <div className="fixed inset-0 -z-10 flex items-center justify-center opacity-[0.03] dark:opacity-[0.05] pointer-events-none text-ink-900 dark:text-ink-700">
            <span className="material-symbols-outlined text-[400px]">
              menu_book
            </span>
          </div>

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
            selectedContext={selectedContext}
            selectedTranslation={selectedTranslation}
            dictData={dictData}
            isLoadingDefinition={isLoadingDefinition}
            isSaving={isSaving}
            isSaved={vocabWords.has(selectedWord.toLowerCase())}
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
