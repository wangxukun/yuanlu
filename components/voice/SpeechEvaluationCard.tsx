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
}

const SpeechEvaluationCard: React.FC<SpeechEvaluationCardProps> = ({
  subtitle,
  audioUrl,
  previousResult,
  onEvaluate,
  currentPlayingId,
  onPlayStart,
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
    onPlayStart,
  });

  const getScoreColor = (score: number) => {
    if (score >= 85)
      return "text-primary-600 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800/50";
    if (score >= 70)
      return "text-accent-600 bg-accent-50 dark:bg-accent-900/20 border-accent-200 dark:border-accent-800/50";
    return "text-error-600 bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800/50";
  };

  const MetricItem = ({
    label,
    value,
    unit = "",
  }: {
    label: string;
    value?: number;
    unit?: string;
  }) => (
    <div className="flex flex-col items-center">
      <div className="text-[10px] uppercase font-bold text-ink-400 dark:text-ink-500 mb-1">
        {label}
      </div>
      <div className="text-sm font-bold text-ink-800 dark:text-ink-200">
        {value !== undefined ? value : "-"}
        {unit && (
          <span className="text-xs font-normal text-ink-400 ml-0.5">
            {unit}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-ink-800 rounded-2xl border border-ink-100 dark:border-ink-700 shadow-sm overflow-hidden transition-all hover:shadow-md">
      {/* 1. Target Text Section */}
      <div className="p-6 border-b border-ink-50 dark:border-ink-700 relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <h3 className="text-lg font-medium text-ink-900 dark:text-ink-100 leading-relaxed font-serif">
              "{subtitle.textEn}"
            </h3>
            {subtitle.textZh && (
              <p className="text-sm text-ink-500 dark:text-ink-400">
                {subtitle.textZh}
              </p>
            )}
          </div>

          {/* 音频播放按钮组 */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 原声按钮 */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={playReferenceAudio}
                disabled={refAudioProgress > 0}
                className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors disabled:opacity-50"
              >
                {refAudioProgress > 0 ? (
                  <div className="w-10 h-10 relative flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-primary-200"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-primary-600 transition-all duration-75"
                        strokeDasharray="113"
                        strokeDashoffset={113 - (113 * refAudioProgress) / 100}
                      />
                    </svg>
                    <Volume2 size={16} className="absolute" />
                  </div>
                ) : (
                  <Volume2 size={20} />
                )}
              </button>
              <span className="text-[10px] text-ink-400 dark:text-ink-500 font-medium">
                原声
              </span>
            </div>

            {/* AI 朗读按钮 */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={speakWithTTS}
                disabled={isTTSLoading}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isSpeaking
                    ? "bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 animate-pulse"
                    : "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50"
                } disabled:opacity-50`}
              >
                {isTTSLoading ? (
                  <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <BotMessageSquare size={20} />
                )}
              </button>
              <span className="text-[10px] text-ink-400 dark:text-ink-500 font-medium">
                AI朗读
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Recording & Result Section */}
      <div className="bg-ink-50/50 dark:bg-ink-900/30 min-h-[140px] flex flex-col justify-center">
        {/* 状态: IDLE (有结果 或 无结果) */}
        {!isRecording && !isProcessing && (
          <div className="p-6">
            {result ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                {/* A. 单词级反馈 */}
                <div className="bg-white dark:bg-ink-800 p-4 rounded-xl border border-ink-200 dark:border-ink-700 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase text-ink-400 dark:text-ink-500 flex items-center gap-1">
                      <Mic size={12} /> 识别结果
                    </span>
                    {/* 播放用户录音 */}
                    {result.userAudioUrl && (
                      <button
                        onClick={toggleUserAudio}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          isUserAudioPlaying
                            ? "bg-primary-600 text-white"
                            : "bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400"
                        }`}
                      >
                        {isUserAudioPlaying ? (
                          <Pause size={10} fill="currentColor" />
                        ) : (
                          <Play size={10} fill="currentColor" />
                        )}
                        {isUserAudioPlaying ? "播放中" : "播放录音"}
                      </button>
                    )}
                  </div>

                  <p className="text-base leading-relaxed break-words">
                    {result.words ? (
                      result.words.map((w, i) => (
                        <span
                          key={i}
                          className={`mr-1.5 inline-block ${
                            w.score >= 80
                              ? "text-primary-600 dark:text-primary-400 font-medium"
                              : w.score < 60
                                ? "text-error-500 dark:text-error-400"
                                : "text-ink-900 dark:text-ink-100"
                          }`}
                          title={`Score: ${w.score}`}
                        >
                          {w.word}
                        </span>
                      ))
                    ) : (
                      <span className="text-ink-900">{result.speechText}</span>
                    )}
                  </p>
                </div>

                {/* B. 详细仪表盘 */}
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 items-center">
                  {/* 综合评分 (大图标) */}
                  <div className="col-span-4 sm:col-span-1 flex flex-row sm:flex-col items-center justify-between sm:justify-center bg-white dark:bg-ink-800 p-3 rounded-xl border border-ink-200 dark:border-ink-700 shadow-sm">
                    <span className="text-xs font-bold uppercase text-ink-400 dark:text-ink-500 mb-0 sm:mb-1">
                      综合评分
                    </span>
                    {/* 综合分使用 accuracyScore 或计算平均值 */}
                    <div
                      className={`w-12 h-12 rounded-full flex flex-col items-center justify-center border-4 ${getScoreColor(result.overallScore || 0)}`}
                    >
                      <span className="text-sm font-bold">
                        {Math.round(result.overallScore || 0)}
                      </span>
                    </div>
                  </div>

                  {/* 详细指标 */}
                  <div className="col-span-4 grid grid-cols-4 gap-2 bg-white dark:bg-ink-800 p-3 rounded-xl border border-ink-200 dark:border-ink-700 shadow-sm">
                    <MetricItem label="发音" value={result.accuracyScore} />
                    <div className="w-px bg-ink-100 dark:bg-ink-700 h-8 self-center"></div>
                    <MetricItem label="流利度" value={result.fluencyScore} />
                    <div className="w-px bg-ink-100 dark:bg-ink-700 h-8 self-center"></div>
                    <MetricItem label="完整度" value={result.integrityScore} />
                    <div className="w-px bg-ink-100 dark:bg-ink-700 h-8 self-center"></div>
                    <MetricItem label="语速" value={result.speed} unit="" />
                  </div>
                </div>

                {/* 重试按钮 */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-ink-800 border border-primary-200 dark:border-primary-900/50 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 font-bold transition-colors text-sm"
                  >
                    <RotateCcw size={16} />
                    再试一次
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1 text-ink-400 dark:text-ink-500">
                  <p className="text-sm font-medium text-ink-600 dark:text-ink-300 mb-1">
                    准备好了吗？
                  </p>
                  <p className="text-xs">点击麦克风开始跟读练习。</p>
                </div>
                <button
                  onClick={startRecording}
                  className="w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg flex items-center justify-center transition-all transform hover:scale-105 active:scale-95"
                >
                  <Mic size={24} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* 状态: RECORDING */}
        {isRecording && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="relative">
              <span className="absolute inline-flex h-full w-full rounded-full bg-error-400 opacity-75 animate-ping"></span>
              <button
                onClick={stopRecording}
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

        {/* 状态: PROCESSING */}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Cpu className="text-primary-600 animate-spin" size={32} />
            <p className="text-sm font-bold text-primary-600">
              正在分析发音...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeechEvaluationCard;
