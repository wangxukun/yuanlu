/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import {
  Mic,
  Square,
  RotateCcw,
  Volume2,
  Volume1,
  Cpu,
  Play,
  Pause,
  BotMessageSquare,
  Info,
  Languages,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SpeechPracticeRecord, Subtitle } from "@/lib/types";
import { useSpeechEvaluation } from "./hooks/useSpeechEvaluation";
import { useWordHighlight } from "@/components/transcript/useWordHighlight";
import { PRACTICE_FONT_SIZE_LEVELS } from "@/store/practice-settings-store";
import type { TextMode } from "@/store/practice-settings-store";

interface SpeechEvaluationCardProps {
  subtitle: Subtitle;
  audioUrl: string; // 原音 URL
  previousResult?: SpeechPracticeRecord;
  onEvaluate: (
    subtitleId: number,
    recordedText: string,
    score: number,
    fullRecord?: any,
    rawDetails?: any,
    audioBase64?: string,
  ) => void;
  currentPlayingId: number | null;
  onPlayStart: (id: number) => void;
  isActive: boolean;
  onActivate: () => void;
  historicalRecords?: SpeechPracticeRecord[];
  // ── 设置中心透传（全部 optional，向后兼容） ──
  fontSizeLevel?: number; // 0-2
  showTranslation?: boolean; // 默认显示中文翻译
  showIpa?: boolean; // 结果区显示音素诊断
  textMode?: TextMode; // 原文 / 音标 / 盲读遮罩
  passThreshold?: number; // 过关分数线（结果区达标标记/文案）
}

const SpeechEvaluationCard: React.FC<SpeechEvaluationCardProps> = ({
  subtitle,
  audioUrl,
  previousResult,
  onEvaluate,
  currentPlayingId,
  onPlayStart,
  isActive,
  onActivate,
  historicalRecords,
  fontSizeLevel = 1,
  showTranslation = false,
  showIpa = true,
  textMode = "normal",
  passThreshold = 80,
}) => {
  const {
    isRecording,
    isProcessing,
    result,
    refAudioProgress,
    isUserAudioPlaying,
    isSpeaking,
    isTTSLoading,
    speakWithTTS,
    playDictAudio,
    startRecording,
    stopRecording,
    playReferenceAudio,
    toggleUserAudio,
    highlightController,
  } = useSpeechEvaluation({
    subtitle,
    audioUrl,
    previousResult,
    onEvaluate,
    currentPlayingId,
    onPlayStart: (id) => {
      onPlayStart(id);
      onActivate();
    },
  });

  const [activeWordIndex, setActiveWordIndex] = React.useState<number | null>(
    null,
  );
  // 移动端语言按钮的本地覆盖；初值与设置面板的 showTranslation 一致。
  // 当设置面板改变 showTranslation 时（如切换开关），清除此覆盖，
  // 使「显示中文翻译」开关即时生效；换句时也清除以回归设置默认。
  const [mobileCnOverride, setMobileCnOverride] = React.useState<
    boolean | null
  >(null);
  const showCn = mobileCnOverride ?? showTranslation;
  React.useEffect(() => {
    setMobileCnOverride(null);
  }, [showTranslation, subtitle]);
  const [showDetails, setShowDetails] = React.useState(false);

  const [playMode, setPlayMode] = React.useState<"normal" | "slow" | null>(
    null,
  );

  // 文本模式相关
  // ipa: word -> 音标字符串（去标点后的词为 key）。用 ref 缓存，跨 subtitle 复用。
  const ipaCacheRef = React.useRef<Record<string, string>>({});
  const [ipaMap, setIpaMap] = React.useState<Record<string, string>>({});

  // blind 盲读：仅当本轮产生了「新的」评测结果时才自动揭示文本对照，
  // 避免回看已练习过的句子（有 previousResult）时直接显示原文、破坏盲读。
  // 新旧结果以 recognitionid 区分（新结果 id = Date.now()，与 previousResult 不同）。
  const [blindRevealed, setBlindRevealed] = React.useState(false);
  React.useEffect(() => {
    // 换句时复位揭示状态
    setBlindRevealed(false);
  }, [subtitle]);
  React.useEffect(() => {
    if (
      result &&
      previousResult &&
      result.recognitionid !== previousResult.recognitionid
    ) {
      setBlindRevealed(true);
    } else if (result && !previousResult) {
      setBlindRevealed(true);
    }
  }, [result, previousResult]);
  // 盲读遮罩是否显示：未揭示时遮挡
  const isBlindMasked = !blindRevealed;

  const textRef = React.useRef<HTMLHeadingElement>(null);
  // 仅原声/慢速播放时随语速线性扫光；TTS/停止时不点亮
  const hlWords = subtitle.words;
  useWordHighlight({
    controller: highlightController,
    containerRef: textRef,
    isHighlighted: true,
    words: hlWords,
    start:
      hlWords && hlWords.length > 0 ? hlWords[0].start : subtitle.startSeconds,
    end:
      hlWords && hlWords.length > 0
        ? hlWords[hlWords.length - 1].end
        : (subtitle.endSeconds ?? subtitle.startSeconds + 3),
  });

  React.useEffect(() => {
    if (refAudioProgress === 0) {
      setPlayMode(null);
    }
  }, [refAudioProgress]);

  // 文本模式 = 音标时：为当前句的去标点 unique 词批量取 IPA（带 ref 缓存，避免重复请求）
  React.useEffect(() => {
    if (textMode !== "ipa") return;
    const words = (
      subtitle.words && subtitle.words.length > 0
        ? subtitle.words.map((w) => w.word)
        : subtitle.textEn.split(/\s+/)
    )
      .map((w) => w.replace(/[.,!?;:"'()[\]{}]/g, "").toLowerCase())
      .filter((w) => w.length > 0);
    const uniqueWords = Array.from(new Set(words));
    const missing = uniqueWords.filter((w) => !(w in ipaCacheRef.current));
    if (missing.length === 0) {
      // 全部命中缓存：直接同步到 state
      const picked: Record<string, string> = {};
      uniqueWords.forEach((w) => (picked[w] = ipaCacheRef.current[w]));
      setIpaMap(picked);
      return;
    }
    let cancelled = false;
    Promise.all(
      missing.map(async (w) => {
        try {
          const res = await fetch(`/api/dict/${encodeURIComponent(w)}`);
          if (!res.ok) return null;
          const json = await res.json();
          if (json.success && json.data) {
            const us = json.data.phonetics?.us || "";
            return [w, us] as const;
          }
        } catch {
          /* ignore single-word failure */
        }
        return null;
      }),
    ).then((entries) => {
      if (cancelled) return;
      const picked: Record<string, string> = {};
      entries.forEach((e) => {
        if (e) {
          ipaCacheRef.current[e[0]] = e[1];
        }
      });
      uniqueWords.forEach((w) => (picked[w] = ipaCacheRef.current[w] ?? ""));
      setIpaMap(picked);
    });
    return () => {
      cancelled = true;
    };
  }, [textMode, subtitle]);

  const handleStartRecording = () => {
    onActivate();
    startRecording();
  };

  // Space 键切换录音：空闲→开始，录音中→停止；处理中或长按重复时忽略。
  // 焦点在可交互元素（按钮/输入框等）上时不拦截，交给浏览器默认行为。
  React.useEffect(() => {
    if (!isActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      // 长按重复
      if (e.repeat) return;
      // 焦点在输入/可编辑元素：让浏览器处理（避免打断输入）
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      // 焦点在按钮/链接上时，Space 会激活它，不拦截
      if (tag === "BUTTON" || tag === "A") return;

      e.preventDefault();
      if (isProcessing) return;
      if (isRecording) {
        stopRecording();
      } else {
        handleStartRecording();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive, isRecording, isProcessing]);

  const getWordColorClass = (score: number) => {
    if (score >= 85)
      return "bg-transparent text-ink-600 border-ink-200 font-medium";
    if (score >= 60)
      return "bg-accent-50 text-accent-700 border-accent-300 font-semibold";
    return "bg-error-50 text-error-600 border-error-300 underline decoration-error-500 decoration-wavy underline-offset-4 font-semibold";
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-primary-600";
    if (score >= 60) return "text-accent-600";
    return "text-error-600";
  };

  return (
    <div
      className={`bg-base-100 rounded-3xl border border-base-200 shadow-xl transition-all duration-500 overflow-hidden ${
        isActive
          ? "scale-100 opacity-100 ring-2 ring-primary/30"
          : "scale-[0.96] opacity-50 hover:opacity-80 cursor-pointer"
      }`}
      onClick={() => {
        if (!isActive) onActivate();
      }}
    >
      {/* 1. 顶部：待朗读核心卡片区 */}
      <div className="p-4 md:p-6 lg:p-8">
        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-6">
          <button
            onClick={(e) => {
              e.stopPropagation();
              speakWithTTS();
            }}
            disabled={isTTSLoading}
            className={`btn btn-sm rounded-full border bg-transparent transition-colors ${
              isSpeaking
                ? "border-primary-400 text-primary-600 bg-primary-50 shadow-inner"
                : "border-primary-200 text-primary-600 hover:bg-primary-50 hover:border-primary-300"
            }`}
          >
            {isTTSLoading ? (
              <span className="loading loading-spinner loading-xs text-primary-600"></span>
            ) : (
              <BotMessageSquare size={16} />
            )}
            <span className="hidden md:inline">AI 朗读</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setPlayMode("normal");
              playReferenceAudio();
            }}
            className="btn btn-sm rounded-full border border-primary-200 text-primary-600 bg-transparent hover:bg-primary-50 hover:border-primary-300 relative overflow-hidden group transition-colors"
          >
            {refAudioProgress > 0 && playMode === "normal" && (
              <div
                className="absolute left-0 top-0 bottom-0 bg-primary-100 transition-all duration-75"
                style={{ width: `${refAudioProgress}%` }}
              />
            )}
            <Volume2 size={16} className="relative z-10" />
            <span className="relative z-10 hidden md:inline">原声播放</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setPlayMode("slow");
              playReferenceAudio(0.75);
            }}
            className="btn btn-sm rounded-full border border-primary-200 text-primary-600 bg-transparent hover:bg-primary-50 hover:border-primary-300 relative overflow-hidden group transition-colors"
          >
            {refAudioProgress > 0 && playMode === "slow" && (
              <div
                className="absolute left-0 top-0 bottom-0 bg-primary-100 transition-all duration-75"
                style={{ width: `${refAudioProgress}%` }}
              />
            )}
            <Volume1 size={16} className="relative z-10" />
            <span className="relative z-10 hidden md:inline">慢速播放</span>
          </button>
        </div>

        <div className="space-y-4">
          <h3
            ref={textRef}
            className={`${
              PRACTICE_FONT_SIZE_LEVELS[fontSizeLevel]?.className ??
              PRACTICE_FONT_SIZE_LEVELS[1].className
            } font-bold text-base-content leading-relaxed font-sans tracking-wide`}
          >
            {(subtitle.words && subtitle.words.length > 0
              ? subtitle.words.map((wordObj) => wordObj.word)
              : subtitle.textEn.split(/\s+/)
            ).map((word, idx) => {
              const cleanWord = word.replace(/[.,!?;:"'()[\]{}]/g, "");
              const isDifficult = cleanWord.length > 6;

              if (textMode === "blind" && isBlindMasked) {
                // 盲读遮罩：等宽占位条，保留词间距与节奏
                return (
                  <span
                    key={idx}
                    data-wi={idx}
                    className="inline-block mr-2 align-bottom select-none"
                    style={{
                      width: `${Math.max(2, word.length) * 0.62}em`,
                      height: "1.1em",
                    }}
                  >
                    <span className="block w-full h-full rounded bg-ink-200 dark:bg-ink-700 blur-[2px]" />
                  </span>
                );
              }

              if (textMode === "ipa") {
                // 词典返回的 phonetics.us 形如 "/ˈskedʒuːl/"，
                // 去掉首尾包裹的 "/" 后显示（避免出现双斜杠）。
                const rawIpa = ipaMap[cleanWord.toLowerCase()];
                const ipa = rawIpa
                  ? rawIpa.replace(/^\/+/, "").replace(/\/+$/, "")
                  : "";
                return (
                  <span
                    key={idx}
                    data-wi={idx}
                    className="relative inline-block mr-2 group"
                  >
                    <span
                      className={`cursor-pointer transition-colors hover:text-primary font-mono ${
                        isDifficult
                          ? "underline decoration-base-300 decoration-dotted underline-offset-8"
                          : ""
                      }`}
                    >
                      {ipa || word}
                    </span>
                  </span>
                );
              }

              // normal 原文模式
              return (
                <span key={idx} className="relative inline-block mr-2 group">
                  <span
                    data-wi={idx}
                    className={`cursor-pointer transition-colors hover:text-primary ${
                      isDifficult
                        ? "underline decoration-base-300 decoration-dotted underline-offset-8"
                        : ""
                    }`}
                  >
                    {word}
                  </span>
                </span>
              );
            })}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMobileCnOverride(!showCn);
              }}
              className="inline-flex md:hidden items-center justify-center p-1.5 ml-1 rounded-lg text-ink-400 hover:text-primary-600 hover:bg-primary-50 transition-colors align-middle"
              title="显示/隐藏翻译"
            >
              <Languages size={20} />
            </button>
          </h3>
          {subtitle.textCn && (
            <p
              className={`text-base md:text-lg text-base-content/60 font-medium animate-in slide-in-from-top-2 ${showCn ? "block" : "hidden"}`}
            >
              {subtitle.textCn.replace(/\[SPEAKER_\d+\]:\s*/g, "")}
            </p>
          )}

          {textMode === "blind" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setBlindRevealed((v) => !v);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 dark:bg-primary-900/30 px-2.5 py-1 rounded-full transition-colors"
              title="显示/隐藏原文"
            >
              <span className="material-symbols-outlined text-sm">
                {isBlindMasked ? "visibility" : "visibility_off"}
              </span>
              {isBlindMasked ? "显示原文" : "重新遮挡"}
            </button>
          )}
        </div>
      </div>

      {/* 2. 中央：录音交互核心区 */}
      {(!result || isRecording || isProcessing) && (
        <div className="bg-base-200/50 border-y border-base-200 p-8 flex flex-col items-center justify-center min-h-[180px] relative overflow-hidden">
          {!isRecording && !isProcessing && (
            <div className="flex flex-col items-center gap-3 animate-in zoom-in duration-300">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartRecording();
                }}
                className="w-20 h-20 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-2xl shadow-primary-600/40 hover:scale-105 hover:bg-primary-700 transition-all duration-300"
              >
                <Mic size={32} />
              </button>
              <span className="text-sm font-bold text-base-content/50 uppercase tracking-widest">
                点击录音
              </span>
              <span className="hidden lg:inline text-xs text-base-content/40">
                或按{" "}
                <kbd className="px-1.5 py-0.5 rounded border border-base-300 bg-base-100 text-[10px] font-bold text-base-content/70">
                  Space
                </kbd>{" "}
                开始 / 停止
              </span>
            </div>
          )}

          {isRecording && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="relative">
                <span className="absolute inline-flex h-full w-full rounded-full bg-error-400 opacity-75 animate-ping"></span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    stopRecording();
                  }}
                  className="relative w-16 h-16 rounded-full bg-error-500 text-white flex items-center justify-center shadow-xl hover:bg-error-600 transition-colors"
                >
                  <Square size={24} fill="currentColor" />
                </button>
              </div>
              <p className="text-sm font-medium text-error-500 animate-pulse">
                正在录音... 点击停止
              </p>
              {/* Fake Visualizer */}
              <div className="flex items-center gap-1 h-6">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-error-400 rounded-full animate-bounce"
                    style={{
                      height: `${Math.random() * 20 + 4}px`,
                      animationDuration: `${0.5 + Math.random() * 0.5}s`,
                    }}
                  ></div>
                ))}
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Cpu className="text-primary-600 animate-spin" size={32} />
              <p className="text-sm font-bold text-primary-600">
                正在分析发音...
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. 下方：评测结果与反馈区 */}
      {!isRecording && !isProcessing && result && (
        <div className="p-4 md:p-6 lg:p-8 bg-base-100 animate-in slide-in-from-bottom-4 duration-500">
          {(() => {
            const pastRecords =
              historicalRecords?.filter(
                (r) => r.recognitionid !== result.recognitionid,
              ) || [];
            const pastScores = pastRecords.map(
              (r) => r.overallScore ?? r.accuracyScore ?? 0,
            );
            const highestPastScore =
              pastScores.length > 0 ? Math.max(...pastScores) : null;
            const currentScore =
              result.overallScore ?? result.accuracyScore ?? 0;
            const isNewBest =
              highestPastScore !== null && currentScore > highestPastScore;
            const improvement = isNewBest
              ? currentScore - (highestPastScore as number)
              : 0;
            const lastAttemptScore =
              pastRecords.length > 0
                ? (pastRecords[0].overallScore ??
                  pastRecords[0].accuracyScore ??
                  0)
                : null;
            const isImprovement =
              !isNewBest &&
              lastAttemptScore !== null &&
              currentScore > lastAttemptScore;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                {/* 左侧：综合得分 */}
                <div className="lg:col-span-4 flex flex-row md:flex-col items-center justify-center md:justify-start gap-6 md:gap-0 relative">
                  <div className="text-sm font-bold text-base-content/40 uppercase tracking-widest mb-0 md:mb-6 hidden md:block">
                    综合得分
                  </div>
                  <div className="relative">
                    <div
                      className={`radial-progress ${getScoreColor(result.overallScore ?? result.accuracyScore ?? 0)} bg-base-200 border-4 border-base-200 [--size:6.5rem] md:[--size:8rem] lg:[--size:10rem] [--thickness:0.6rem] md:[--thickness:0.8rem] lg:[--thickness:1rem]`}
                      style={
                        {
                          "--value":
                            result.overallScore ?? result.accuracyScore ?? 0,
                        } as React.CSSProperties
                      }
                      role="progressbar"
                    >
                      <span className="text-4xl md:text-4xl lg:text-5xl font-black text-base-content">
                        {Math.round(
                          result.overallScore ?? result.accuracyScore ?? 0,
                        )}
                      </span>
                    </div>
                    {(result.overallScore ?? result.accuracyScore ?? 0) >= 85 &&
                      !isNewBest && (
                        <div className="absolute -top-4 -right-4 text-4xl animate-bounce">
                          ✨
                        </div>
                      )}
                    {isNewBest && (
                      <div className="absolute -top-4 -right-12 bg-warning text-warning-content text-xs font-black px-2 py-1 rounded-full shadow-lg border-2 border-warning-content animate-bounce whitespace-nowrap">
                        👑 历史新高 +{Math.round(improvement)}分
                      </div>
                    )}
                    {isImprovement && (
                      <div className="absolute -top-3 -right-6 bg-success text-success-content text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse">
                        ↗ 进步了
                      </div>
                    )}
                  </div>
                  <div className="mt-0 md:mt-6 text-left md:text-center flex-1 md:flex-none">
                    <div className="text-xs font-bold text-base-content/40 uppercase tracking-widest mb-1 md:hidden">
                      综合得分
                    </div>
                    <div className="font-extrabold text-xl lg:text-2xl text-base-content">
                      {(result.overallScore ?? result.accuracyScore ?? 0) >=
                      passThreshold
                        ? "Excellent!"
                        : (result.overallScore ?? result.accuracyScore ?? 0) >=
                            60
                          ? "Good Job!"
                          : "Keep Trying!"}
                    </div>
                    <div className="text-xs md:text-sm text-base-content/60 mt-1 md:mt-1.5 font-medium">
                      {(result.overallScore ?? result.accuracyScore ?? 0) >=
                      passThreshold
                        ? `已过关（≥${passThreshold}），发音很棒！`
                        : `继续练习，达到 ${passThreshold} 分即可过关`}
                    </div>
                  </div>
                </div>

                {/* 右侧：逐词反馈与维度 */}
                <div className="lg:col-span-8 flex flex-col justify-center space-y-8">
                  {/* 逐词发音纠错 */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-bold text-base-content/40 uppercase tracking-widest">
                        逐词纠错详情
                      </div>
                      {result.userAudioUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleUserAudio();
                          }}
                          className={`btn btn-sm rounded-full border-none ${
                            isUserAudioPlaying
                              ? "bg-primary-600 text-white hover:bg-primary-700"
                              : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                          }`}
                        >
                          {isUserAudioPlaying ? (
                            <Pause size={14} fill="currentColor" />
                          ) : (
                            <Play size={14} fill="currentColor" />
                          )}
                          {isUserAudioPlaying ? "回放中" : "回放我的发音"}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2.5 text-lg">
                      {result.words && result.words.length > 0 ? (
                        result.words.map((w, i) => (
                          <div key={i} className="relative">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                if (w.score < 85) {
                                  setActiveWordIndex(
                                    activeWordIndex === i ? null : i,
                                  );
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg border transition-all inline-block ${getWordColorClass(
                                w.score,
                              )} ${
                                w.score < 85
                                  ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5"
                                  : ""
                              }`}
                            >
                              {w.word}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-base-content font-medium">
                          {result.speechText}
                        </span>
                      )}
                    </div>

                    {/* Inline Expand for Phonemes */}
                    {showIpa &&
                      activeWordIndex !== null &&
                      result.words &&
                      result.words[activeWordIndex] && (
                        <div className="mt-4 bg-base-200/50 rounded-xl border border-base-200 p-4 animate-in slide-in-from-top-2 duration-300">
                          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
                            <div className="text-sm font-bold text-base-content/80 flex items-center flex-wrap">
                              单词{" "}
                              <span className="text-primary-600 px-1.5 mx-1 bg-primary/10 rounded">
                                {result.words[activeWordIndex].word}
                              </span>{" "}
                              的音素诊断：
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const w = result.words![activeWordIndex];
                                  playDictAudio(w.word, 2);
                                }}
                                className="btn btn-sm bg-base-100 hover:bg-base-200 text-info-600 border border-base-300 shadow-sm"
                              >
                                <Volume2 size={14} /> 美音
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const w = result.words![activeWordIndex];
                                  playDictAudio(w.word, 1);
                                }}
                                className="btn btn-sm bg-base-100 hover:bg-base-200 text-info-600 border border-base-300 shadow-sm"
                              >
                                <Volume2 size={14} /> 英音
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const w = result.words![activeWordIndex];
                                  // 取该词在字幕中的词级时间戳（绝对全集秒），
                                  // 精确播放对应原声片段，不再用用户录音相对时间估算。
                                  const targetWord = w.word
                                    .replace(/[.,!?;:"'()[\]{}]/g, "")
                                    .toLowerCase();
                                  const refWord = subtitle.words?.find(
                                    (sw) =>
                                      sw.word
                                        .replace(/[.,!?;:"'()[\]{}]/g, "")
                                        .toLowerCase() === targetWord,
                                  );
                                  const refStart = refWord
                                    ? refWord.start
                                    : subtitle.startSeconds + (w.start || 0);
                                  const refEnd = refWord
                                    ? refWord.end
                                    : subtitle.startSeconds +
                                      (w.end || (w.start || 0) + 0.5);
                                  playReferenceAudio(1.0, refStart, refEnd);
                                }}
                                className="btn btn-sm bg-base-100 hover:bg-base-200 text-primary-600 border border-base-300 shadow-sm"
                              >
                                <BotMessageSquare size={14} /> 原声
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const w = result.words![activeWordIndex];
                                  toggleUserAudio(w.start, w.end);
                                }}
                                className="btn btn-sm bg-base-100 hover:bg-base-200 text-secondary-600 border border-base-300 shadow-sm"
                              >
                                <Mic size={14} /> 我
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {result.words[activeWordIndex].phonemes &&
                            result.words[activeWordIndex].phonemes.length >
                              0 ? (
                              result.words[activeWordIndex].phonemes.map(
                                (ph: any, pIndex: number) => {
                                  const phScore =
                                    ph.score ?? ph.pronunciation ?? 0;
                                  const phName = ph.phoneme ?? ph.phone ?? "";
                                  return (
                                    <div
                                      key={pIndex}
                                      className={`flex flex-col items-center justify-center min-w-[3rem] px-3 py-1.5 rounded-lg border ${
                                        phScore >= 80
                                          ? "bg-success/10 border-success/20 text-success-700"
                                          : "bg-error/10 border-error/30 text-error-600 font-bold"
                                      }`}
                                    >
                                      <span className="text-base font-mono tracking-wider">
                                        /{phName}/
                                      </span>
                                      <span className="text-[10px] opacity-70">
                                        {Math.round(phScore)}
                                      </span>
                                    </div>
                                  );
                                },
                              )
                            ) : (
                              <div className="text-sm text-base-content/50 py-2">
                                无详尽音素数据
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    {showIpa &&
                      result.words &&
                      result.words.some((w) => w.score < 85) && (
                        <div className="mt-3 text-[11px] font-medium text-warning flex items-center gap-1.5 bg-warning/10 w-fit px-2 py-1 rounded">
                          <Info size={12} />{" "}
                          点击黄色或红色单词查看音素诊断并对比发音
                        </div>
                      )}
                  </div>

                  {/* 多维指标横向柱状图 */}
                  <div className="space-y-4 pt-4 border-t border-base-200/50 md:pt-0 md:border-t-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDetails(!showDetails);
                      }}
                      className="flex md:hidden items-center justify-between w-full text-sm font-bold text-base-content/60 hover:text-primary-600 transition-colors"
                    >
                      <span className="uppercase tracking-widest">
                        详细维度
                      </span>
                      {showDetails ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                    <div className="hidden md:block text-sm font-bold text-base-content/40 uppercase tracking-widest mb-2">
                      详细维度
                    </div>
                    <div
                      className={`space-y-4 animate-in slide-in-from-top-2 ${showDetails ? "block" : "hidden md:block"}`}
                    >
                      {[
                        {
                          label: "准确度",
                          value: result.accuracyScore || 0,
                          color:
                            "[&::-webkit-progress-value]:bg-primary-600 [&::-moz-progress-bar]:bg-primary-600",
                        },
                        {
                          label: "流利度",
                          value:
                            result.fluencyScore ?? result.accuracyScore ?? 0,
                          color:
                            "[&::-webkit-progress-value]:bg-info-600 [&::-moz-progress-bar]:bg-info-600",
                        },
                        {
                          label: "完整度",
                          value:
                            result.integrityScore ?? result.accuracyScore ?? 0,
                          color:
                            "[&::-webkit-progress-value]:bg-accent-600 [&::-moz-progress-bar]:bg-accent-600",
                        },
                      ].map((metric, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                          <div className="w-16 text-sm font-bold text-base-content/60 shrink-0">
                            {metric.label}
                          </div>
                          <div className="flex-1">
                            <progress
                              className={`progress ${metric.color} w-full h-3 bg-base-200`}
                              value={metric.value}
                              max="100"
                            ></progress>
                          </div>
                          <div className="w-10 text-right text-sm font-black text-base-content shrink-0">
                            {metric.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end mt-8 pt-6 border-t border-base-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStartRecording();
              }}
              className="btn bg-transparent border border-ink-200 text-ink-600 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-600 transition-colors rounded-xl"
            >
              <RotateCcw size={18} />
              再试一次
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeechEvaluationCard;
