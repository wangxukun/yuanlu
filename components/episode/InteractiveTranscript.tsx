"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { usePlayerStore } from "@/store/player-store";
import { useSession } from "next-auth/react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { Episode } from "@/core/episode/episode.entity";
import { toast } from "sonner";
import { parseTimeStr } from "@/lib/tools";

// Import new decoupled components
import { MergedSubtitleItem, ProcessedSubtitle } from "./transcript/types";
import { SubtitleItem } from "./transcript/SubtitleItem";
import { TranscriptToolbar } from "./transcript/TranscriptToolbar";
import { SelectionMenu } from "./transcript/SelectionMenu";
import { VocabularyModal } from "./transcript/VocabularyModal";
import { useTranscriptScroll } from "./transcript/useTranscriptScroll";
import { useTranscriptSelection } from "./transcript/useTranscriptSelection";

interface InteractiveTranscriptProps {
  subtitles: MergedSubtitleItem[];
  episode: Episode;
}

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
  const [showTranslation, setShowTranslation] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
  const processedSubtitles: ProcessedSubtitle[] = useMemo(() => {
    if (!Array.isArray(subtitles)) return [];
    return subtitles.map((item) => ({
      ...item,
      start: parseTimeStr(item.startTime),
      end: parseTimeStr(item.endTime),
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
  );

  const { selectionMenu, setSelectionMenu } = useTranscriptSelection(
    containerRef,
    processedSubtitles,
  );

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
      setSelectionMenu,
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
    [isPlayingThisEpisode, isPlaying, pause, setSelectionMenu],
  );

  // --- Save Logic ---
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
      <TranscriptToolbar
        isPlayingThisEpisode={isPlayingThisEpisode}
        autoScroll={autoScroll}
        setAutoScroll={setAutoScroll}
        showTranslation={showTranslation}
        setShowTranslation={setShowTranslation}
      />

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
        definition={definition}
        setDefinition={setDefinition}
        isLoadingDefinition={isLoadingDefinition}
        wordDetails={wordDetails}
        isSaving={isSaving}
        onSave={handleSaveVocabulary}
        onPlayAudio={playWordAudio}
      />
    </div>
  );
}
