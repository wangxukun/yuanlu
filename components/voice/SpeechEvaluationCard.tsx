// type: uploaded file
// fileName: yuanlu/components/voice/SpeechEvaluationCard.tsx

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  Square,
  RotateCcw,
  Volume2,
  Cpu,
  Play,
  Pause,
} from "lucide-react";
import { SpeechPracticeRecord, Subtitle } from "@/lib/types";
import { evaluateSpeech } from "@/lib/actions/speech";
import { toast } from "sonner";

// --- 类型定义 ---

interface YoudaoWord {
  word: string;
  pronunciation: number;
  start: number;
  end: number;
  // 移除 [key: string]: any 以修复 ESLint 报错
}

interface YoudaoResult {
  pronunciation: number; // 发音准确度
  fluency: number; // 流利度
  integrity: number; // 完整度
  speed: number; // 语速
  overall: number; // 综合评分
  words: YoudaoWord[];
  errorCode: string;
}

// 扩展本地使用的评测结果类型，包含详细指标
interface DetailedPracticeRecord extends SpeechPracticeRecord {
  fluencyScore?: number;
  integrityScore?: number;
  overallScore?: number;
  speed?: number;
  words?: { word: string; score: number }[];
  userAudioUrl?: string; // 本地录音回放地址
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

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
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<DetailedPracticeRecord | undefined>(
    previousResult ? { ...previousResult } : undefined,
  );

  // 播放进度状态
  const [refAudioProgress, setRefAudioProgress] = useState(0); // 原音进度
  const [isUserAudioPlaying, setIsUserAudioPlaying] = useState(false); // 用户录音播放状态

  // --- 录音相关 Refs ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioDataRef = useRef<Float32Array[]>([]);

  // --- 播放相关 Refs ---
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null); // 原音播放实例
  const userAudioInstanceRef = useRef<HTMLAudioElement | null>(null); // 用户录音播放实例
  const rafIdRef = useRef<number | null>(null);

  // 用于清理的 Ref (避免 useEffect 依赖 result 导致闭包问题)
  const userAudioUrlRef = useRef<string | undefined>(undefined);

  // 同步 ref
  useEffect(() => {
    userAudioUrlRef.current = result?.userAudioUrl;
  }, [result?.userAudioUrl]);

  // 使用 useCallback 确保函数引用稳定，解决 hooks 依赖问题
  const stopAllAudio = useCallback(() => {
    // 停止原音
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
      audioInstanceRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setRefAudioProgress(0);

    // 停止用户录音
    if (userAudioInstanceRef.current) {
      userAudioInstanceRef.current.pause();
      userAudioInstanceRef.current = null;
      setIsUserAudioPlaying(false);
    }
  }, []);

  const stopRecordingCleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  // 监听外部播放控制
  useEffect(() => {
    if (currentPlayingId !== null && currentPlayingId !== subtitle.id) {
      stopAllAudio();
    }
  }, [currentPlayingId, subtitle.id, stopAllAudio]);

  // 组件卸载清理
  useEffect(() => {
    return () => {
      stopAllAudio();
      stopRecordingCleanup();
      // 清理生成的 Blob URL (使用 ref 获取最新值)
      if (userAudioUrlRef.current) {
        URL.revokeObjectURL(userAudioUrlRef.current);
      }
    };
  }, [stopAllAudio, stopRecordingCleanup]);

  const startRecording = async () => {
    stopAllAudio();
    // 清理旧的 Blob URL
    if (result?.userAudioUrl) {
      URL.revokeObjectURL(result.userAudioUrl);
    }
    setResult(undefined);
    audioDataRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext!)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        audioDataRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      toast.error("无法访问麦克风，请检查权限设置");
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    setIsProcessing(true);

    stopRecordingCleanup();

    try {
      const buffers = audioDataRef.current;
      if (buffers.length === 0) throw new Error("No audio recorded");

      const totalLength = buffers.reduce((acc, curr) => acc + curr.length, 0);
      const mergedBuffer = new Float32Array(totalLength);
      let offset = 0;
      for (const buffer of buffers) {
        mergedBuffer.set(buffer, offset);
        offset += buffer.length;
      }

      // 编码 WAV
      const wavBlob = encodeWAV(mergedBuffer, 16000);

      // 生成本地回放 URL
      const userAudioBlobUrl = URL.createObjectURL(wavBlob);

      // 转 Base64 上传
      const reader = new FileReader();
      reader.readAsDataURL(wavBlob);
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(",")[1];

        const response = await evaluateSpeech(
          base64String,
          subtitle.textEn,
          16000,
        );

        setIsProcessing(false);

        if (response.error) {
          toast.error(response.error);
          return;
        }

        // 解析 Youdao 详细数据
        const details = response.details as YoudaoResult;

        // 提取单词级数据
        let wordList: { word: string; score: number }[] = [];
        let speechText = "";

        if (details && Array.isArray(details.words)) {
          wordList = details.words.map((w) => ({
            word: w.word,
            score: w.pronunciation,
          }));
          speechText = wordList.map((w) => w.word).join(" ");
        } else {
          // 兜底
          speechText = subtitle.textEn;
        }

        const score = Math.round(
          details?.overall || details?.pronunciation || response.score || 0,
        );

        const newResult: DetailedPracticeRecord = {
          recognitionid: Date.now(),
          userid: "current",
          episodeid: "current",
          speechText: speechText,
          accuracyScore: Math.round(details?.pronunciation || 0), // 发音分
          overallScore: Math.round(details?.overall || 0),
          targetText: subtitle.textEn,
          targetStartTime: subtitle.startSeconds,
          recognitionDate: new Date().toISOString(),
          // 扩展字段
          fluencyScore: Math.round(details?.fluency || 0),
          integrityScore: Math.round(details?.integrity || 0),
          speed: details?.speed ? Math.round(details.speed) : undefined,
          words: wordList,
          userAudioUrl: userAudioBlobUrl,
        };

        setResult(newResult);
        // 回调父组件 (保持接口兼容)
        onEvaluate(subtitle.id, speechText, score);
      };
    } catch (err) {
      console.error("Processing error:", err);
      setIsProcessing(false);
      toast.error("评测处理失败");
    }
  };

  // --- 播放控制逻辑 ---

  const playReferenceAudio = () => {
    stopAllAudio();
    onPlayStart(subtitle.id);

    const audio = new Audio(audioUrl);
    audioInstanceRef.current = audio;

    const startTime = subtitle.startSeconds;
    const endTime = subtitle.endSeconds || startTime + 3;
    const duration = endTime - startTime;

    audio.currentTime = startTime;
    audio.play().catch((err) => console.error("Play error:", err));

    const tick = () => {
      if (!audioInstanceRef.current) return;
      const audio = audioInstanceRef.current;

      if (audio.paused && audio.currentTime === 0) {
        stopAllAudio();
        return;
      }

      const current = audio.currentTime;
      if (current >= endTime) {
        audio.pause();
        stopAllAudio();
        return;
      }

      const progress = Math.min(
        100,
        Math.max(0, ((current - startTime) / duration) * 100),
      );
      setRefAudioProgress(progress);
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
  };

  const toggleUserAudio = () => {
    if (!result?.userAudioUrl) return;

    if (isUserAudioPlaying) {
      if (userAudioInstanceRef.current) {
        userAudioInstanceRef.current.pause();
        setIsUserAudioPlaying(false);
      }
    } else {
      stopAllAudio(); // 停止原音播放
      const audio = new Audio(result.userAudioUrl);
      userAudioInstanceRef.current = audio;

      audio.onended = () => {
        setIsUserAudioPlaying(false);
        userAudioInstanceRef.current = null;
      };

      audio.play().catch((e) => {
        console.error("User audio play error:", e);
        toast.error("无法播放录音");
      });
      setIsUserAudioPlaying(true);
    }
  };

  // --- 辅助渲染函数 ---

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 70) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-rose-600 bg-rose-50 border-rose-200";
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
      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
        {label}
      </div>
      <div className="text-sm font-bold text-slate-800">
        {value !== undefined ? value : "-"}
        {unit && (
          <span className="text-xs font-normal text-slate-400 ml-0.5">
            {unit}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
      {/* 1. Target Text Section */}
      <div className="p-6 border-b border-slate-50 relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <h3 className="text-lg font-medium text-slate-900 leading-relaxed font-serif">
              "{subtitle.textEn}"
            </h3>
            {subtitle.textZh && (
              <p className="text-sm text-slate-500">{subtitle.textZh}</p>
            )}
          </div>

          <button
            onClick={playReferenceAudio}
            disabled={refAudioProgress > 0}
            className="shrink-0 w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors disabled:opacity-50"
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
                    className="text-indigo-200"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-indigo-600 transition-all duration-75"
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
        </div>
      </div>

      {/* 2. Recording & Result Section */}
      <div className="bg-slate-50/50 min-h-[140px] flex flex-col justify-center">
        {/* 状态: IDLE (有结果 或 无结果) */}
        {!isRecording && !isProcessing && (
          <div className="p-6">
            {result ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                {/* A. 单词级反馈 */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1">
                      <Mic size={12} /> 识别结果
                    </span>
                    {/* 播放用户录音 */}
                    {result.userAudioUrl && (
                      <button
                        onClick={toggleUserAudio}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          isUserAudioPlaying
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
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
                              ? "text-emerald-600 font-medium"
                              : w.score < 60
                                ? "text-rose-500"
                                : "text-slate-900"
                          }`}
                          title={`Score: ${w.score}`}
                        >
                          {w.word}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-900">
                        {result.speechText}
                      </span>
                    )}
                  </p>
                </div>

                {/* B. 详细仪表盘 */}
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 items-center">
                  {/* 综合评分 (大图标) */}
                  <div className="col-span-4 sm:col-span-1 flex flex-row sm:flex-col items-center justify-between sm:justify-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-xs font-bold uppercase text-slate-400 mb-0 sm:mb-1">
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
                  <div className="col-span-4 grid grid-cols-4 gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <MetricItem label="发音" value={result.accuracyScore} />
                    <div className="w-px bg-slate-100 h-8 self-center"></div>
                    <MetricItem label="流利度" value={result.fluencyScore} />
                    <div className="w-px bg-slate-100 h-8 self-center"></div>
                    <MetricItem label="完整度" value={result.integrityScore} />
                    <div className="w-px bg-slate-100 h-8 self-center"></div>
                    <MetricItem label="语速" value={result.speed} unit="" />
                  </div>
                </div>

                {/* 重试按钮 */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 font-bold transition-colors text-sm"
                  >
                    <RotateCcw size={16} />
                    再试一次
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1 text-slate-400">
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    准备好了吗？
                  </p>
                  <p className="text-xs">点击麦克风开始跟读练习。</p>
                </div>
                <button
                  onClick={startRecording}
                  className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center transition-all transform hover:scale-105 active:scale-95"
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
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
              <button
                onClick={stopRecording}
                className="relative w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl hover:bg-red-600 transition-colors"
              >
                <Square size={24} fill="currentColor" />
              </button>
            </div>
            <p className="text-sm font-medium text-red-500 animate-pulse">
              正在录音... 点击停止
            </p>
            {/* Fake Visualizer */}
            <div className="flex items-center gap-1 h-6">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-red-400 rounded-full animate-bounce"
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
            <Cpu className="text-indigo-600 animate-spin" size={32} />
            <p className="text-sm font-bold text-indigo-600">正在分析发音...</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 工具函数：将 Float32Array PCM 数据编码为 WAV Blob (16bit, 16000Hz, Mono)
// ----------------------------------------------------------------------
function encodeWAV(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(view, 0, "RIFF");
  // file length
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, "WAVE");
  // format chunk identifier
  writeString(view, 12, "fmt ");
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count (1)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sampleRate * blockAlign)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, "data");
  // data chunk length
  view.setUint32(40, samples.length * 2, true);

  // 写 PCM 数据
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: "audio/wav" });
}

export default SpeechEvaluationCard;
