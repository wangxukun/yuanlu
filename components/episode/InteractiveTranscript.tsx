"use client";

import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  useOptimistic,
  startTransition,
} from "react";
import { usePlayerStore } from "@/store/player-store";
import { useSession } from "next-auth/react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { Episode } from "@/core/episode/episode.entity";
import { toast } from "sonner";
import { checkExclusivePlay } from "@/lib/client/auth-utils";
import { handleDictionaryQuotaBlock } from "@/lib/client/dictionary-quota";
import { handleVocabularyQuotaBlock } from "@/lib/client/vocabulary-quota";
import { toggleSentenceSave } from "@/lib/actions/sentences-actions";
import { shouldPreviewSentenceQuota } from "@/lib/quota";
import {
  isSentenceQuotaBlocked,
  handleSentenceQuotaBlock,
} from "@/lib/client/sentence-quota";
import {
  getStagedSentences,
  removeStagedSentence,
  subscribeStaging,
} from "@/lib/client/sentence-staging";
import type { SavedSentenceItem } from "@/core/sentences/dto";

// Import new decoupled components
import { MergedSubtitleItem, ProcessedSubtitle } from "./transcript/types";
import { SubtitleItem } from "./transcript/SubtitleItem";
import { DictationItem } from "./transcript/DictationItem";
import { TranscriptToolbar } from "./transcript/TranscriptToolbar";
import { SelectionMenu } from "./transcript/SelectionMenu";
import { VocabularyModal } from "./transcript/VocabularyModal";
import { ProofreadModal } from "./transcript/ProofreadModal";
import { QuickTagDrawer } from "@/components/sentence/QuickTagDrawer";
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

  // --- Sentence Collection (句子本) State ---
  // 真实书签态（subtitleId 集合）
  const [savedSentenceKeys, setSavedSentenceKeys] = useState<Set<number>>(
    new Set(),
  );
  // [P3-a] 本集暂存句（免费容量满时"半亮 PRO 徽记态"渲染）
  const [stagedKeys, setStagedKeys] = useState<Set<number>>(new Set());
  // [P3-a] 80% 预告单集会话只提示一次（第 24 条起提示剩余位置）
  const quotaPreviewShownRef = useRef(false);
  // 待编辑的句子（toast 的“添加标签/笔记”action 打开，非 null 时弹出抽屉）
  const [tagDrawerSentence, setTagDrawerSentence] =
    useState<SavedSentenceItem | null>(null);

  // Fetch saved sentence keys for this episode (bookmark state)
  React.useEffect(() => {
    if (!isLoggedIn || !episode?.episodeid) {
      setSavedSentenceKeys(new Set());
      return;
    }
    let cancelled = false;
    fetch(`/api/sentences/keys?episodeid=${episode.episodeid}`)
      .then((r) => r.json())
      .then((d) => {
        if (
          !cancelled &&
          d.success &&
          d.data &&
          Array.isArray(d.data.subtitleIds)
        ) {
          setSavedSentenceKeys(new Set(d.data.subtitleIds));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, episode?.episodeid]);

  // [P3-a] 暂存集合与本集书签态合并渲染；订阅暂存区变更（含跨标签页）
  React.useEffect(() => {
    if (!episode?.episodeid) {
      setStagedKeys(new Set());
      return;
    }
    const refresh = () => {
      setStagedKeys(
        new Set(
          getStagedSentences()
            .filter(
              (s) => s.episodeid === episode.episodeid && s.subtitleId != null,
            )
            .map((s) => s.subtitleId as number),
        ),
      );
    };
    refresh();
    return subscribeStaging(refresh);
  }, [episode?.episodeid]);

  // 乐观更新：transition 内先翻转书签态，server action 完成后回落到真实状态
  const [optimisticSavedKeys, addOptimisticSaveKey] = useOptimistic(
    savedSentenceKeys,
    (state: Set<number>, subId: number) => {
      const next = new Set(state);
      if (next.has(subId)) next.delete(subId);
      else next.add(subId);
      return next;
    },
  );

  const handleToggleSaveSentence = useCallback(
    (sub: ProcessedSubtitle) => {
      if (!session?.user) {
        toast("请先登录", { description: "登录后即可收藏句子到句子本" });
        const loginModal = document.getElementById(
          "email_check_modal_box",
        ) as HTMLDialogElement | null;
        if (loginModal) loginModal.showModal();
        return;
      }
      // [P3-a] 已暂存的句子再点书签 = 取消暂存（不落库）
      if (stagedKeys.has(sub.id)) {
        removeStagedSentence({
          episodeid: episode.episodeid,
          subtitleId: sub.id,
          startTime: sub.start,
        });
        toast("已取消暂存该句");
        return;
      }
      const subId = sub.id;
      startTransition(async () => {
        addOptimisticSaveKey(subId);
        const res = await toggleSentenceSave({
          episodeid: episode.episodeid,
          subtitleId: sub.id,
          startTime: sub.start,
          endTime: sub.end,
          enText: sub.textEn,
          zhText: sub.textCn.replace(/\[SPEAKER_\d+\]:\s*/g, ""),
        });
        if (res.success && res.data) {
          setSavedSentenceKeys((prev) => {
            const next = new Set(prev);
            if (res.data!.saved) next.add(subId);
            else next.delete(subId);
            return next;
          });
          if (res.data.saved && res.data.sentence) {
            // 对齐源项目：toast 携带「添加标签/笔记」action，点击才打开抽屉
            const saved = res.data.sentence;
            // [P3-a] 80% 预告：第 24 条起在成功 toast 内单独一行醒目提示（单集
            // 会话只提示一次；不另起 toast——堆叠会遮挡"添加标签/笔记"操作）
            const total = res.data.totalCount;
            const limit = res.data.limit;
            let previewLine: React.ReactNode = null;
            if (
              total != null &&
              limit != null &&
              shouldPreviewSentenceQuota(total, limit) &&
              !quotaPreviewShownRef.current
            ) {
              quotaPreviewShownRef.current = true;
              previewLine = (
                <span className="mt-1.5 block rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  句子本还剩 {limit - total} 个位置
                </span>
              );
            }
            toast.success("已收藏至「句子本」", {
              description: (
                <>
                  {`"${sub.textEn.slice(0, 32)}..."`}
                  {previewLine}
                </>
              ),
              action: {
                label: "添加标签/笔记",
                onClick: () => setTagDrawerSentence(saved),
              },
            });
          } else {
            toast("已从「句子本」移除");
          }
        } else if (isSentenceQuotaBlocked(res)) {
          // [P3-a] 免费容量触墙：不报错不回滚——入暂存 + 浮卡承接
          //（乐观态随 transition 结束回落，stagedKeys 生效渲染半亮徽记态）
          handleSentenceQuotaBlock(
            {
              episodeid: episode.episodeid,
              subtitleId: sub.id,
              startTime: sub.start,
              endTime: sub.end,
              enText: sub.textEn,
              zhText: sub.textCn.replace(/\[SPEAKER_\d+\]:\s*/g, ""),
            },
            {
              totalCount: res.data?.totalCount ?? 0,
              limit: res.data?.limit ?? 0,
            },
          );
        } else {
          toast.error(res.message || "收藏失败，请重试");
        }
      });
    },
    [session, episode, addOptimisticSaveKey, stagedKeys],
  );

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
        // [P1-1] 生词配额拦截走会员弹窗承接（含埋点），不再只弹错误 toast
        if (handleVocabularyQuotaBlock(errorData)) return;
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
            <InformationCircleIcon className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
            <span>提示：登录后点击单词可一键加入生词本</span>
          </p>
        </div>
      )}

      {/* --- 字幕内容区 --- */}
      {/* 扁平无缝排版：字幕行零外间距，靠行内 padding + border-b 分割线划分句段 */}
      <div className="pb-32" ref={containerRef}>
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
              isSaved={optimisticSavedKeys.has(sub.id)}
              isStaged={stagedKeys.has(sub.id)}
              onToggleSave={handleToggleSaveSentence}
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

      {/* 收藏成功后的快捷标签抽屉（toast「添加标签/笔记」action 打开） */}
      <QuickTagDrawer
        sentence={tagDrawerSentence}
        onClose={() => setTagDrawerSentence(null)}
        onUpdated={() => {}}
      />
    </div>
  );
}
