"use client";

import React from "react";
import {
  Mic,
  Square,
  RotateCcw,
  Volume2,
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
  onEvaluate: (subtitleId: number, recordedText: string, score: number) => void;
  currentPlayingId: number | null;
  onPlayStart: (id: number) => void;
  isActive: boolean;
  onActivate: () => void;
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

  const handleStartRecording = () => {
    onActivate();
    startRecording();
  };

  const getWordColorClass = (score: number) => {
    if (score >= 85)
      return "bg-success/10 text-success border-success/30 font-bold";
    if (score >= 60)
      return "bg-warning/10 text-warning-content border-warning/30 font-semibold";
    return "bg-error/10 text-error border-error/30 underline decoration-error decoration-wavy underline-offset-4 font-semibold";
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-error";
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
            className={`btn btn-sm rounded-full ${isSpeaking ? "btn-primary" : "btn-outline btn-primary"}`}
          >
            {isTTSLoading ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <BotMessageSquare size={16} />
            )}
            AI 朗读
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              playReferenceAudio();
            }}
            className="btn btn-sm btn-outline btn-primary rounded-full relative overflow-hidden group"
          >
            {refAudioProgress > 0 && (
              <div
                className="absolute left-0 top-0 bottom-0 bg-primary/20 transition-all duration-75"
                style={{ width: `${refAudioProgress}%` }}
              />
            )}
            <Volume2 size={16} className="relative z-10" />
            <span className="relative z-10 group-hover:text-primary-content">
              原声播放
            </span>
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
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-max">
                    <div className="bg-neutral text-neutral-content text-xs px-3 py-1.5 rounded-lg shadow-lg flex flex-col items-center">
                      <span className="font-mono text-[10px] text-neutral-content/70">
                        IPA
                      </span>
                      <span>{cleanWord}</span>
                    </div>
                    <div className="w-2 h-2 bg-neutral rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                  </div>
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
      <div className="bg-base-200/50 border-y border-base-200 p-8 flex flex-col items-center justify-center min-h-[180px] relative overflow-hidden">
        {!isRecording && !isProcessing && (
          <div className="flex flex-col items-center gap-3 animate-in zoom-in duration-300">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStartRecording();
              }}
              className="btn btn-circle btn-primary btn-lg w-20 h-20 shadow-2xl shadow-primary/40 hover:scale-105 hover:shadow-primary/50 transition-all duration-300"
            >
              <Mic size={32} />
            </button>
            <span className="text-sm font-bold text-base-content/50 uppercase tracking-widest">
              点击录音
            </span>
          </div>
        )}

        {isRecording && (
          <div className="flex flex-col items-center w-full max-w-md animate-in fade-in duration-300">
            <div className="flex items-center justify-center gap-1.5 h-16 mb-6 w-full">
              {[...Array(24)].map((_, i) => {
                // 利用绝对随机性，不使用服务端渲染，直接用内联样式控制高度跳跃
                // 使用 animation-delay 结合 Tailwind 的 bounce
                const dur = 0.4 + (i % 5) * 0.1;
                const del = (i % 7) * 0.1;
                return (
                  <div
                    key={i}
                    className="w-1.5 bg-primary rounded-full animate-bounce"
                    style={{
                      height: "100%",
                      animationDuration: `${dur}s`,
                      animationDelay: `${del}s`,
                    }}
                  />
                );
              })}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                stopRecording();
              }}
              className="btn btn-circle btn-error w-16 h-16 shadow-xl shadow-error/30 hover:scale-105 transition-transform"
            >
              <Square size={24} fill="currentColor" />
            </button>
            <span className="mt-4 text-xs font-bold text-error animate-pulse">
              正在录音...
            </span>
          </div>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in">
            <div className="relative flex items-center justify-center w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
              <div
                className="absolute inset-2 rounded-full border-4 border-secondary/20 border-b-secondary animate-spin"
                style={{
                  animationDirection: "reverse",
                  animationDuration: "1.5s",
                }}
              ></div>
              <Cpu size={24} className="text-primary animate-pulse" />
            </div>
            <span className="text-sm font-bold text-primary tracking-widest">
              AI 深度分析中...
            </span>
          </div>
        )}
      </div>

      {/* 3. 下方：评测结果与反馈区 */}
      {!isRecording && !isProcessing && result && (
        <div className="p-6 md:p-8 bg-base-100 animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* 左侧：综合得分 */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center">
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
                {(result.overallScore || 0) >= 85 && (
                  <div className="absolute -top-4 -right-4 text-4xl animate-bounce">
                    ✨
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
                      className={`btn btn-sm rounded-full ${
                        isUserAudioPlaying
                          ? "btn-primary"
                          : "btn-ghost bg-base-200"
                      }`}
                    >
                      {isUserAudioPlaying ? (
                        <Pause size={14} fill="currentColor" />
                      ) : (
                        <Play size={14} fill="currentColor" />
                      )}
                      {isUserAudioPlaying ? "回放中" : "我的录音"}
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
                                <BotMessageSquare size={20} className="mb-2" />
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
                    color: "progress-primary",
                  },
                  {
                    label: "流利度",
                    value: result.fluencyScore || 0,
                    color: "progress-info",
                  },
                  {
                    label: "完整度",
                    value: result.integrityScore || 0,
                    color: "progress-secondary",
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

          <div className="flex justify-end mt-8 pt-6 border-t border-base-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStartRecording();
              }}
              className="btn btn-outline hover:btn-primary"
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
