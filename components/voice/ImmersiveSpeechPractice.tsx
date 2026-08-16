/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { Episode } from "@/core/episode/episode.entity";
import { Subtitle, SpeechPracticeRecord } from "@/lib/types";
import SpeechEvaluationCard from "./SpeechEvaluationCard";
import PracticeSettingsButton from "./PracticeSettingsButton";
import { useUIStore } from "@/store/ui-store";
import {
  usePracticeSettingsStore,
  selectEffectivePassThreshold,
} from "@/store/practice-settings-store";
import { toast } from "sonner";
import { saveSpeechResult } from "@/lib/actions/speech";
import {
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Lock,
} from "lucide-react";

interface ImmersiveSpeechPracticeProps {
  isOpen: boolean;
  onClose: () => void;
  episode: Episode;
}

export default function ImmersiveSpeechPractice({
  isOpen,
  onClose,
  episode,
}: ImmersiveSpeechPracticeProps) {
  // Data State
  const [isLoading, setIsLoading] = useState(true);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [records, setRecords] = useState<SpeechPracticeRecord[]>([]);
  const [isTrialMode, setIsTrialMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [playingSubtitleId, setPlayingSubtitleId] = useState<number | null>(
    null,
  );
  // URL 中指定的目标 subtitleId（来自发音弱项本跳转），待 filteredSubtitles 就绪后定位。
  // null 表示无定向跳转请求。
  const [pendingSubtitleId, setPendingSubtitleId] = useState<number | null>(
    null,
  );

  // Settings
  const settings = usePracticeSettingsStore();
  const effectivePassThreshold = selectEffectivePassThreshold(settings);

  // Refs
  const cardListRef = useRef<HTMLDivElement>(null);

  // Fetch Data
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/speech/practice-data?id=${episode.episodeid}&t=${Date.now()}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          throw new Error("Failed to fetch practice data");
        }
        const json = await res.json();

        if (!json.success || !json.data) {
          throw new Error(json.error || "Failed to load data");
        }

        if (isMounted) {
          const loadedSubtitles = json.data.subtitles || [];
          setSubtitles(loadedSubtitles);
          setRecords(json.data.previousRecords || []);
          setIsTrialMode(json.data.isTrialMode || false);

          // 解析 URL 中的 subtitleId（发音弱项本跳转），记录下来；
          // 真正的定位在 filteredSubtitles 就绪后由专门 effect 处理，
          // 避免在「完整列表」与「过滤后列表」之间索引错位。
          setActiveCardIndex(0);
          if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            const subtitleId = urlParams.get("subtitleId");
            setPendingSubtitleId(subtitleId ? parseInt(subtitleId) : null);
          } else {
            setPendingSubtitleId(null);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const errMsg =
            err instanceof Error ? err.message : "Something went wrong";
          setError(errMsg);
          toast.error("加载评测数据失败");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, episode.episodeid]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  const getLatestResult = (subtitleId: number) => {
    const targetSub = subtitles.find((s) => s.id === subtitleId);
    if (!targetSub) return undefined;

    return [...records]
      .filter(
        (r) =>
          r.subtitleId === targetSub.id ||
          (r.targetText === targetSub.textEn &&
            Math.abs((r.targetStartTime || 0) - targetSub.startSeconds) < 0.5),
      )
      .sort(
        (a, b) =>
          new Date(b.recognitionDate || 0).getTime() -
          new Date(a.recognitionDate || 0).getTime(),
      )[0];
  };

  const getHistoricalRecords = (subtitleId: number) => {
    const targetSub = subtitles.find((s) => s.id === subtitleId);
    if (!targetSub) return [];

    return [...records]
      .filter(
        (r) =>
          r.subtitleId === targetSub.id ||
          (r.targetText === targetSub.textEn &&
            Math.abs((r.targetStartTime || 0) - targetSub.startSeconds) < 0.5),
      )
      .sort(
        (a, b) =>
          new Date(b.recognitionDate || 0).getTime() -
          new Date(a.recognitionDate || 0).getTime(),
      );
  };

  // 句子长度过滤 + 只练未掌握
  const filteredSubtitles = useMemo(() => {
    return subtitles.filter((sub) => {
      const wordCount = sub.textEn.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < settings.minWords) return false;
      if (settings.maxWords < 50 && wordCount > settings.maxWords) return false;
      if (settings.onlyUnmastered) {
        const latest = getLatestResult(sub.id);
        const latestScore = latest?.accuracyScore ?? 0;
        if (latestScore >= effectivePassThreshold) return false;
      }
      return true;
    });
    // getLatestResult 依赖 records，已纳入下方依赖数组
  }, [
    subtitles,
    settings.minWords,
    settings.maxWords,
    settings.onlyUnmastered,
    effectivePassThreshold,
    records,
  ]);

  const activeSubtitle = filteredSubtitles[activeCardIndex];

  // Progress calculations（基于过滤后的句子集合）
  const practicedInFilter = new Set(
    records
      .filter((r) => filteredSubtitles.some((s) => s.textEn === r.targetText))
      .map((r) => r.targetStartTime),
  ).size;
  const progressPercent =
    filteredSubtitles.length > 0
      ? (practicedInFilter / filteredSubtitles.length) * 100
      : 0;
  const isCompleted = progressPercent >= 100;

  // 定向跳转：在 filteredSubtitles（而非完整 subtitles）中定位 URL 指定的句子，
  // 修正「过滤后索引错位 / 目标被过滤掉」导致无法定位到对应句子的 bug。
  // 此 effect 必须早于下方「越界夹回」effect 执行（声明在前），并在命中后清除 pending，
  // 以免被夹回逻辑覆盖。
  useEffect(() => {
    if (pendingSubtitleId == null) return;
    if (isLoading || filteredSubtitles.length === 0) return;

    const targetIdx = filteredSubtitles.findIndex(
      (s) => s.id === pendingSubtitleId,
    );
    if (targetIdx !== -1) {
      setActiveCardIndex(targetIdx);
    } else {
      // 目标句被当前过滤条件（句子长度 / 只练未掌握）排除：
      // 提示用户并定位到「目标在完整列表中的位置」最接近的可见句。
      const fullIdx = subtitles.findIndex((s) => s.id === pendingSubtitleId);
      const fallbackIdx =
        fullIdx === -1
          ? 0
          : (() => {
              // 找 filteredSubtitles 中 startSeconds 不小于目标的最近一句
              const targetStart = subtitles[fullIdx].startSeconds;
              const after = filteredSubtitles.findIndex(
                (s) => s.startSeconds >= targetStart,
              );
              return after !== -1 ? after : filteredSubtitles.length - 1;
            })();
      setActiveCardIndex(fallbackIdx);
      toast.info("该句被当前过滤条件排除，已定位到最近的句子", {
        duration: 3000,
      });
    }
    setPendingSubtitleId(null);
  }, [pendingSubtitleId, isLoading, filteredSubtitles, subtitles]);

  // 过滤后 activeCardIndex 可能越界，夹回合法范围
  useEffect(() => {
    setActiveCardIndex((prev) =>
      Math.min(prev, Math.max(0, filteredSubtitles.length - 1)),
    );
  }, [filteredSubtitles.length]);

  const handleNext = useCallback(() => {
    setActiveCardIndex((prev) =>
      Math.min(prev + 1, filteredSubtitles.length - 1),
    );
  }, [filteredSubtitles.length]);

  const handlePrev = useCallback(() => {
    setActiveCardIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleEvaluate = async (
    subtitleId: number,
    recordedText: string,
    score: number,
    fullRecord?: any,
    rawDetails?: any,
    audioBase64?: string,
  ) => {
    const targetSub = subtitles.find((s) => s.id === subtitleId);
    if (!targetSub) return;

    const newRecord: SpeechPracticeRecord = {
      recognitionid: Date.now(),
      userid: "current",
      episodeid: episode.episodeid,
      speechText: recordedText,
      accuracyScore: score,
      targetText: targetSub.textEn,
      targetStartTime: targetSub.startSeconds,
      recognitionDate: new Date().toISOString(),
      subtitleId: subtitleId,
      ...(fullRecord && {
        fluencyScore: fullRecord.fluencyScore,
        integrityScore: fullRecord.integrityScore,
        overallScore: fullRecord.overallScore,
        speed: fullRecord.speed,
        userAudioUrl: fullRecord.userAudioUrl,
        words: fullRecord.words,
      }),
    };

    setRecords((prev) => [...prev, newRecord]);

    // Auto-advance if score reaches the effective pass threshold
    if (settings.autoAdvance && score >= effectivePassThreshold) {
      setTimeout(() => {
        handleNext();
      }, 1500);
    }

    const result = await saveSpeechResult({
      episodeId: episode.episodeid,
      targetText: targetSub.textEn,
      speechText: recordedText,
      accuracyScore: score,
      targetStartTime: targetSub.startSeconds,
      subtitleId: subtitleId,
      fluencyScore: fullRecord?.fluencyScore,
      integrityScore: fullRecord?.integrityScore,
      overallScore: fullRecord?.overallScore,
      speed: fullRecord?.speed,
      audioBase64: audioBase64,
      detailJson: rawDetails,
    });

    if (result.error) {
      toast.error(
        "message" in result && result.message ? result.message : "保存进度失败",
      );
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || filteredSubtitles.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        handleNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeCardIndex, filteredSubtitles.length]);

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.offset.y > 150 && info.velocity.y > 200) {
      onClose();
    }
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
          className="fixed inset-0 z-[200] bg-white/95 dark:bg-ink-950/95 backdrop-blur-xl flex flex-col md:flex-row overflow-hidden font-sans"
        >
          {/* ── Left Panel (Tablet & Desktop) ── */}
          <div className="hidden md:flex flex-col bg-white/90 dark:bg-ink-900/90 backdrop-blur-xl border-ink-200 dark:border-ink-800 shrink-0 w-[35%] max-w-[400px] xl:max-w-[480px] h-full border-r">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 h-14 shrink-0">
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
              <PracticeSettingsButton variant="drawer" />
            </div>

            {/* Cover & Title */}
            <div className="px-6 pb-6 flex flex-col gap-4 border-b border-ink-100 dark:border-ink-800/50">
              <div className="w-full aspect-video rounded-xl shadow-lg border border-ink-200 dark:border-ink-700 overflow-hidden shrink-0 relative">
                <img
                  src={episode.coverUrl}
                  alt={episode.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md">
                  <span className="text-white text-xs font-bold tracking-widest uppercase">
                    语音评测
                  </span>
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-ink-900 dark:text-ink-100 line-clamp-2 leading-tight">
                  {episode.title}
                </h1>
                <p className="text-sm font-medium text-ink-500 dark:text-ink-400 mt-1 line-clamp-1">
                  {episode.podcast?.title || "Unknown Podcast"}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs font-bold text-ink-500 dark:text-ink-400 mb-1.5">
                  <span>已练 {practicedInFilter} 句</span>
                  <span>共 {filteredSubtitles.length} 句</span>
                </div>
                <div className="w-full h-2 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Sentence List Navigation */}
            <div
              className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-1"
              ref={cardListRef}
            >
              <h3 className="text-xs font-bold text-ink-400 dark:text-ink-500 uppercase tracking-widest px-2 mb-3">
                所有句子
              </h3>

              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-ink-300" />
                </div>
              ) : filteredSubtitles.length > 0 ? (
                filteredSubtitles.map((sub, index) => {
                  const latestResult = getLatestResult(sub.id);
                  const isActive = index === activeCardIndex;
                  const hasPracticed = !!latestResult;
                  const score = latestResult?.accuracyScore || 0;

                  return (
                    <button
                      key={sub.id}
                      onClick={() => setActiveCardIndex(index)}
                      className={`w-full text-left p-3 rounded-xl transition-colors flex items-start gap-3 ${
                        isActive
                          ? "bg-primary-50 dark:bg-primary-900/30 ring-1 ring-primary-200 dark:ring-primary-800"
                          : "hover:bg-ink-50 dark:hover:bg-ink-800/50"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {hasPracticed ? (
                          score >= 85 ? (
                            <span className="text-primary-500">✅</span>
                          ) : score >= 60 ? (
                            <span className="text-accent-500">🎯</span>
                          ) : (
                            <span className="text-error-500">⭕</span>
                          )
                        ) : (
                          <div
                            className={`w-4 h-4 rounded-full border-2 ${isActive ? "border-primary-400" : "border-ink-300 dark:border-ink-600"}`}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm line-clamp-2 leading-relaxed ${isActive ? "font-semibold text-primary-700 dark:text-primary-300" : "font-medium text-ink-700 dark:text-ink-300"}`}
                        >
                          {sub.textEn}
                        </div>
                        {isActive && sub.textCn && (
                          <div className="text-xs text-primary-600/70 dark:text-primary-400/70 mt-1 line-clamp-1">
                            {sub.textCn.replace(/\[SPEAKER_\d+\]:\s*/g, "")}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8 text-ink-400 text-sm">
                  没有找到练习句子
                </div>
              )}

              {/* 试用模式：在最后（第5句）下方显示解锁提示 */}
              {!isLoading && isTrialMode && subtitles.length > 0 && (
                <div className="mt-4 p-4 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/20 text-center mx-2 mb-4">
                  <div className="flex justify-center mb-2">
                    <Lock className="w-6 h-6 text-primary-500" />
                  </div>
                  <h4 className="text-sm font-bold text-primary-800 dark:text-primary-200 mb-1">
                    解锁全部练习句子
                  </h4>
                  <p className="text-xs text-primary-600/80 dark:text-primary-400/80 mb-3 leading-relaxed">
                    您正在体验前 5 句试用，成为 PRO
                    会员即可解锁本集全篇语音评测。
                  </p>
                  <button
                    onClick={() =>
                      useUIStore.getState().openPremiumModal("trial_unlock")
                    }
                    className="btn btn-sm bg-primary-600 hover:bg-primary-700 text-white border-none w-full rounded-lg"
                  >
                    解锁 PRO 会员
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Panel / Main Area ── */}
          <div className="flex-1 flex flex-col relative h-full bg-ink-50/50 dark:bg-ink-950/50 overflow-hidden">
            {/* Mobile Top Bar */}
            <div className="md:hidden flex items-center justify-between px-4 h-14 bg-white/80 dark:bg-ink-900/80 backdrop-blur-md border-b border-ink-200 dark:border-ink-800 shrink-0 relative z-10">
              <button onClick={onClose} className="p-2 -ml-2 text-ink-500">
                <span className="material-symbols-outlined">expand_more</span>
              </button>
              <div className="text-sm font-bold text-ink-800 dark:text-ink-200">
                语音评测
              </div>
              <PracticeSettingsButton variant="mobile" />
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-8 lg:p-12 flex flex-col items-center relative">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center text-ink-400 my-auto">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p className="font-medium">加载评测数据中...</p>
                </div>
              ) : error ? (
                <div className="bg-error-50 dark:bg-error-900/20 text-error-600 p-6 rounded-2xl max-w-sm text-center border border-error-100 dark:border-error-800 my-auto">
                  <span className="material-symbols-outlined text-4xl mb-2">
                    error
                  </span>
                  <p className="font-bold">{error}</p>
                </div>
              ) : filteredSubtitles.length > 0 && activeSubtitle ? (
                <div className="w-full max-w-2xl mx-auto my-auto pb-24 md:pb-0 shrink-0">
                  {isTrialMode && isCompleted && (
                    <div className="mb-8 p-6 bg-white dark:bg-ink-900 rounded-2xl border border-primary-200 dark:border-primary-800 shadow-xl text-center">
                      <h2 className="text-xl font-bold text-ink-900 dark:text-ink-100 mb-2">
                        体验已结束
                      </h2>
                      <p className="text-sm text-ink-500 mb-6">
                        升级为 PRO
                        会员，解锁本集全部练习卡片及更多独家高级内容。
                      </p>
                      <button
                        onClick={() =>
                          useUIStore
                            .getState()
                            .openPremiumModal("trial_complete")
                        }
                        className="btn btn-primary rounded-xl"
                      >
                        解锁全部
                      </button>
                    </div>
                  )}

                  {!isTrialMode && isCompleted && (
                    <div className="mb-8 p-6 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-2xl text-center shadow-lg animate-in slide-in-from-top-4">
                      <CheckCircle2 className="w-12 h-12 text-success-500 mx-auto mb-3" />
                      <h2 className="text-xl font-bold text-success-700 dark:text-success-400 mb-1">
                        会话已完成！
                      </h2>
                      <p className="text-sm text-success-600 dark:text-success-500">
                        你已经练习了所有的句子。
                      </p>
                    </div>
                  )}

                  <SpeechEvaluationCard
                    subtitle={activeSubtitle}
                    audioUrl={episode.audioUrl || ""}
                    previousResult={getLatestResult(activeSubtitle.id)}
                    historicalRecords={getHistoricalRecords(activeSubtitle.id)}
                    onEvaluate={handleEvaluate}
                    currentPlayingId={playingSubtitleId}
                    onPlayStart={(id) => setPlayingSubtitleId(id)}
                    isActive={true}
                    onActivate={() => {}}
                    fontSizeLevel={settings.fontSizeLevel}
                    showTranslation={settings.showTranslation}
                    showIpa={settings.showIpa}
                    textMode={settings.textMode}
                    passThreshold={effectivePassThreshold}
                  />
                </div>
              ) : (
                <div className="text-center text-ink-400">
                  <p>没有字幕可供练习</p>
                </div>
              )}
            </div>

            {/* Bottom Navigation Bar */}
            {!isLoading && filteredSubtitles.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 p-3 md:p-6 bg-gradient-to-t from-white via-white/90 dark:from-ink-950 dark:via-ink-950/90 to-transparent flex justify-center pb-6 md:pb-6 pointer-events-none">
                <div className="bg-white dark:bg-ink-800 shadow-xl border border-ink-100 dark:border-ink-700 rounded-xl md:rounded-2xl flex items-center p-1.5 md:p-2 gap-3 md:gap-4 pointer-events-auto w-full max-w-sm mx-auto">
                  <button
                    onClick={handlePrev}
                    disabled={activeCardIndex === 0}
                    className="p-2 md:p-3 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-ink-600 dark:text-ink-300"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <div className="flex-1 flex flex-col items-center">
                    <div className="text-sm font-bold text-ink-700 dark:text-ink-300">
                      {activeCardIndex + 1}{" "}
                      <span className="text-ink-400 mx-1">/</span>{" "}
                      {filteredSubtitles.length}
                    </div>
                    <div className="w-full max-w-[120px] h-1.5 bg-ink-100 dark:bg-ink-700 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${((activeCardIndex + 1) / filteredSubtitles.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleNext}
                    disabled={activeCardIndex === filteredSubtitles.length - 1}
                    className="p-2 md:p-3 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-ink-600 dark:text-ink-300"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
