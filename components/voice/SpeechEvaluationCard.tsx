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
} from "lucide-react";
import { SpeechPracticeRecord, Subtitle } from "@/lib/types";
import { useSpeechEvaluation } from "./hooks/useSpeechEvaluation";

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
    startRecording,
    stopRecording,
    playReferenceAudio,
    toggleUserAudio,
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

  const [playMode, setPlayMode] = React.useState<"normal" | "slow" | null>(
    null,
  );

  React.useEffect(() => {
    if (refAudioProgress === 0) {
      setPlayMode(null);
    }
  }, [refAudioProgress]);

  const handleStartRecording = () => {
    onActivate();
    startRecording();
  };

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
      <div className="p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-3 mb-6">
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
            AI 朗读
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
            <span className="relative z-10">原声播放</span>
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
            <span className="relative z-10">慢速播放</span>
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl md:text-3xl font-bold text-base-content leading-relaxed font-sans tracking-wide">
            {subtitle.textEn.split(" ").map((word, idx) => {
              const cleanWord = word.replace(/[.,!?]/g, "");
              const isDifficult = cleanWord.length > 6;
              return (
                <span key={idx} className="relative inline-block mr-2 group">
                  <span
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
          </h3>
          {subtitle.textZh && (
            <p className="text-lg text-base-content/60 font-medium">
              {subtitle.textZh}
            </p>
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
        <div className="p-6 md:p-8 bg-base-100 animate-in slide-in-from-bottom-4 duration-500">
          {(() => {
            const pastRecords =
              historicalRecords?.filter(
                (r) => r.recognitionid !== result.recognitionid,
              ) || [];
            const pastScores = pastRecords.map(
              (r) => r.overallScore || r.accuracyScore || 0,
            );
            const highestPastScore =
              pastScores.length > 0 ? Math.max(...pastScores) : null;
            const currentScore = result.overallScore || 0;
            const isNewBest =
              highestPastScore !== null && currentScore > highestPastScore;
            const improvement = isNewBest
              ? currentScore - (highestPastScore as number)
              : 0;
            const lastAttemptScore =
              pastRecords.length > 0
                ? pastRecords[0].overallScore ||
                  pastRecords[0].accuracyScore ||
                  0
                : null;
            const isImprovement =
              !isNewBest &&
              lastAttemptScore !== null &&
              currentScore > lastAttemptScore;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                {/* 左侧：综合得分 */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center relative">
                  <div className="text-sm font-bold text-base-content/40 uppercase tracking-widest mb-6">
                    综合得分
                  </div>
                  <div className="relative">
                    <div
                      className={`radial-progress ${getScoreColor(result.overallScore || 0)} bg-base-200 border-4 border-base-200`}
                      style={
                        {
                          "--value": result.overallScore || 0,
                          "--size": "10rem",
                          "--thickness": "1rem",
                        } as React.CSSProperties
                      }
                      role="progressbar"
                    >
                      <span className="text-5xl font-black text-base-content">
                        {Math.round(result.overallScore || 0)}
                      </span>
                    </div>
                    {(result.overallScore || 0) >= 85 && !isNewBest && (
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
                  <div className="mt-6 text-center">
                    <div className="font-extrabold text-xl text-base-content">
                      {(result.overallScore || 0) >= 85
                        ? "Excellent!"
                        : (result.overallScore || 0) >= 60
                          ? "Good Job!"
                          : "Keep Trying!"}
                    </div>
                    <div className="text-sm text-base-content/60 mt-1.5 font-medium">
                      {(result.overallScore || 0) >= 85
                        ? "发音非常地道，请继续保持！"
                        : "继续练习，会有更大进步！"}
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

                            {/* 对比小卡片 */}
                            {activeWordIndex === i && w.score < 85 && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 w-52 bg-base-100 rounded-xl shadow-2xl border border-base-200 p-3 animate-in zoom-in duration-200">
                                <div className="text-xs font-bold text-base-content/50 mb-3 text-center uppercase tracking-widest">
                                  发音对比
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      playReferenceAudio();
                                    }}
                                    className="flex flex-col items-center p-3 rounded-xl bg-base-200 hover:bg-base-300 hover:text-primary transition-colors"
                                  >
                                    <BotMessageSquare
                                      size={20}
                                      className="mb-2"
                                    />
                                    <span className="text-[11px] font-bold">
                                      标准发音
                                    </span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleUserAudio();
                                    }}
                                    className="flex flex-col items-center p-3 rounded-xl bg-base-200 hover:bg-base-300 hover:text-secondary transition-colors"
                                  >
                                    <Mic size={20} className="mb-2" />
                                    <span className="text-[11px] font-bold">
                                      你的发音
                                    </span>
                                  </button>
                                </div>
                                <div className="w-4 h-4 bg-base-100 border-b border-r border-base-200 rotate-45 absolute -bottom-2 left-1/2 -translate-x-1/2"></div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <span className="text-base-content font-medium">
                          {result.speechText}
                        </span>
                      )}
                    </div>
                    {result.words && result.words.some((w) => w.score < 85) && (
                      <div className="mt-3 text-[11px] font-medium text-warning flex items-center gap-1.5 bg-warning/10 w-fit px-2 py-1 rounded">
                        <Info size={12} /> 点击黄色或红色单词对比发音
                      </div>
                    )}
                  </div>

                  {/* 多维指标横向柱状图 */}
                  <div className="space-y-4">
                    <div className="text-sm font-bold text-base-content/40 uppercase tracking-widest mb-2">
                      详细维度
                    </div>
                    {[
                      {
                        label: "准确度",
                        value: result.accuracyScore || 0,
                        color:
                          "[&::-webkit-progress-value]:bg-primary-600 [&::-moz-progress-bar]:bg-primary-600",
                      },
                      {
                        label: "流利度",
                        value: result.fluencyScore || 0,
                        color:
                          "[&::-webkit-progress-value]:bg-info-600 [&::-moz-progress-bar]:bg-info-600",
                      },
                      {
                        label: "完整度",
                        value: result.integrityScore || 0,
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
