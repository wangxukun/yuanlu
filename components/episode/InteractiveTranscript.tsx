"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { usePlayerStore } from "@/store/player-store";
import { useSession } from "next-auth/react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { Episode } from "@/core/episode/episode.entity";
import { toast } from "sonner";
import { checkExclusivePlay } from "@/lib/client/auth-utils";
import { handleDictionaryQuotaBlock } from "@/lib/client/dictionary-quota";

// Import new decoupled components
import { MergedSubtitleItem, ProcessedSubtitle } from "./transcript/types";
import { SubtitleItem } from "./transcript/SubtitleItem";
import { DictationItem } from "./transcript/DictationItem";
import { TranscriptToolbar } from "./transcript/TranscriptToolbar";
import { SelectionMenu } from "./transcript/SelectionMenu";
import { VocabularyModal } from "./transcript/VocabularyModal";
import { ProofreadModal } from "./transcript/ProofreadModal";
import { useTranscriptScroll } from "./transcript/useTranscriptScroll";
import { useTranscriptSelection } from "./transcript/useTranscriptSelection";
import type { DictEntryDTO } from "@/core/dictionary/dto";

interface InteractiveTranscriptProps {
  subtitles: MergedSubtitleItem[];
  episode: Episode;
  hideToolbar?: boolean;
  transcriptMode?: "read" | "dictate";
  onTranscriptModeChange?: (mode: "read" | "dictate") => void;
  showTranslation?: boolean;
  onShowTranslationChange?: (show: boolean) => void;
  autoScroll?: boolean;
  onAutoScrollChange?: (scroll: boolean) => void;
  loopingIndex?: number | null;
  onLoopingIndexChange?: (index: number | null) => void;
  headerContent?: React.ReactNode;
}

export default function InteractiveTranscript({
  subtitles,
  episode,
  hideToolbar,
  transcriptMode: controlledTranscriptMode,
  onTranscriptModeChange,
  showTranslation: controlledShowTranslation,
  onShowTranslationChange,
  autoScroll: controlledAutoScroll,
  onAutoScrollChange,
  loopingIndex: controlledLoopingIndex,
  onLoopingIndexChange,
  headerContent,
}: InteractiveTranscriptProps) {
  // 1. Auth State
  const { data: session } = useSession();
  const userRole = session?.user?.role || "USER";
  const isLoggedIn = !!session?.user;

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
    setPlaybackRate,
  } = usePlayerStore();

  const isPlayingThisEpisode = currentEpisode?.episodeid === episode.episodeid;

  // 3. Local State (with controlled prop fallbacks)
  const [internalShowTranslation, setInternalShowTranslation] = useState(false);
  const [internalAutoScroll, setInternalAutoScroll] = useState(true);
  const [internalTranscriptMode, setInternalTranscriptMode] = useState<
    "read" | "dictate"
  >("read");
  const [internalLoopingIndex, setInternalLoopingIndex] = useState<
    number | null
  >(null);

  const showTranslation = controlledShowTranslation ?? internalShowTranslation;
  const setShowTranslation =
    onShowTranslationChange ?? setInternalShowTranslation;

  const autoScroll = controlledAutoScroll ?? internalAutoScroll;
  const setAutoScroll = onAutoScrollChange ?? setInternalAutoScroll;

  const transcriptMode = controlledTranscriptMode ?? internalTranscriptMode;
  const setTranscriptMode = onTranscriptModeChange ?? setInternalTranscriptMode;

  const loopingIndex =
    controlledLoopingIndex !== undefined
      ? controlledLoopingIndex
      : internalLoopingIndex;
  const setLoopingIndex = onLoopingIndexChange ?? setInternalLoopingIndex;

  const lastJumpTimeRef = useRef<number>(0);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [selectedWord, setSelectedWord] = useState<string>("");
  const [selectedContext, setSelectedContext] = useState<string>("");
  const [selectedTranslation, setSelectedTranslation] = useState<string>("");
  const [selectedTimestamp, setSelectedTimestamp] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dictData, setDictData] = useState<DictEntryDTO | null>(null);
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false);
  const [globalVocabWords, setGlobalVocabWords] = useState<Set<string>>(
    new Set(),
  );

  // Fetch global vocabulary words (for checking if word is saved)
  React.useEffect(() => {
    if (!isLoggedIn) {
      setGlobalVocabWords(new Set());
      return;
    }
    let cancelled = false;
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
  }, [isLoggedIn]);

  // Proofread Modal State
  const [proofreadSub, setProofreadSub] = useState<ProcessedSubtitle | null>(
    null,
  );
  const [isProofreadOpen, setIsProofreadOpen] = useState(false);

  // 4. Process Subtitles
  const processedSubtitles: ProcessedSubtitle[] = useMemo(() => {
    if (!Array.isArray(subtitles)) return [];
    return subtitles.map((item) => ({
      ...item,
    }));
  }, [subtitles]);

  // 5. Hooks
  const { activeIndex } = useTranscriptScroll(
    audioRef,
    isPlaying,
    isPlayingThisEpisode,
    processedSubtitles,
    currentTime,
    autoScroll,
    "subtitle",
    {
      transcriptMode,
      loopingIndex,
      lastJumpTimeRef,
    },
  );

  const { selectionMenu, setSelectionMenu } = useTranscriptSelection(
    containerRef,
    processedSubtitles,
  );

  // --- Dictation Mode Logic ---
  // 1. Playback Rate
  React.useEffect(() => {
    if (transcriptMode === "dictate") {
      setPlaybackRate(0.8);
    } else {
      setPlaybackRate(1.0);
    }
  }, [transcriptMode, setPlaybackRate]);

  const handleDictationSuccess = useCallback(() => {
    lastJumpTimeRef.current = Date.now();
    // Jump to next subtitle or pause
    const nextSub = processedSubtitles[activeIndex + 1];
    if (nextSub && audioRef) {
      audioRef.currentTime = nextSub.start;
      setCurrentTime(nextSub.start);
    } else if (pause) {
      pause();
    }
  }, [activeIndex, processedSubtitles, audioRef, setCurrentTime, pause]);

  // --- 交互逻辑 ---
  const handleJump = useCallback(
    (startTime: number) => {
      lastJumpTimeRef.current = Date.now();
      setSelectionMenu((prev) => ({ ...prev, visible: false }));
      if (!checkExclusivePlay(episode, session)) return;

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
      setSelectionMenu,
    ],
  );

  const handleWordClick = useCallback(
    async (
      word: string,
      contextEn: string,
      contextCn: string,
      timestamp: number,
    ) => {
      setSelectionMenu((prev) => ({ ...prev, visible: false }));

      if (isPlayingThisEpisode && isPlaying && pause) pause();

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
    [isPlayingThisEpisode, isPlaying, pause, setSelectionMenu],
  );

  const handleProofread = useCallback(
    (sub: ProcessedSubtitle) => {
      if (!session?.user) {
        toast("请先登录", { description: "登录后即可参与字幕校对共建！" });
        const loginModal = document.getElementById(
          "email_check_modal_box",
        ) as HTMLDialogElement;
        if (loginModal) loginModal.showModal();
        return;
      }
      setProofreadSub(sub);
      setIsProofreadOpen(true);
    },
    [session],
  );

  // --- Save Logic ---
  const handleSaveVocabulary = async () => {
    if (!selectedWord) return;

    if (!session?.user) {
      toast.error("请先登录后再保存生词");
      return;
    }

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
        toast.success("已加入生词本");
        setGlobalVocabWords((prev) => {
          const newSet = new Set(prev);
          newSet.add(selectedWord.toLowerCase());
          return newSet;
        });
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

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col h-full">
      {headerContent}
      {!hideToolbar && (
        <TranscriptToolbar
          isPlayingThisEpisode={isPlayingThisEpisode}
          autoScroll={autoScroll}
          setAutoScroll={setAutoScroll}
          showTranslation={showTranslation}
          setShowTranslation={setShowTranslation}
          transcriptMode={transcriptMode}
          setTranscriptMode={setTranscriptMode}
        />
      )}

      {!session?.user && (
        <div className="mb-6 -mt-2 text-center animate-fade-in-down">
          <p className="text-xs font-medium text-base-content/60 bg-base-200/50 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-base-200 cursor-default hover:bg-base-200 transition-colors">
            <InformationCircleIcon className="w-3.5 h-3.5 text-primary" />
            <span>提示：登录后点击单词可一键加入生词本</span>
          </p>
        </div>
      )}

      {/* --- 字幕内容区 --- */}
      <div className="space-y-1 pb-32" ref={containerRef}>
        {processedSubtitles.map((sub, index) => {
          const isActive = index === activeIndex;
          if (transcriptMode === "dictate" && isActive) {
            return (
              <DictationItem
                key={sub.id || index}
                sub={sub}
                isActive={isActive}
                isPlaying={isPlaying}
                showTranslation={showTranslation}
                onJump={handleJump}
                onSuccess={handleDictationSuccess}
              />
            );
          }
          return (
            <SubtitleItem
              key={sub.id || index}
              sub={sub}
              isActive={isActive}
              isPlaying={isPlaying}
              currentTime={currentTime}
              showTranslation={showTranslation}
              audioRef={audioRef}
              isLooping={loopingIndex === index}
              onToggleLoop={() =>
                setLoopingIndex(loopingIndex === index ? null : index)
              }
              onJump={handleJump}
              onWordClick={handleWordClick}
              onProofread={handleProofread}
            />
          );
        })}
        {!isLoggedIn && (
          <div className="flex justify-center mt-8 pb-4">
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
    </div>
  );
}
