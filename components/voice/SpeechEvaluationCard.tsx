"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, RotateCcw, Volume2, Cpu } from "lucide-react";
import { SpeechPracticeRecord, Subtitle } from "@/lib/types";
import { evaluateSpeech } from "@/lib/actions/speech";
import { toast } from "sonner";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

interface SpeechEvaluationCardProps {
  subtitle: Subtitle;
  audioUrl: string;
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
  const [result, setResult] = useState<SpeechPracticeRecord | undefined>(
    previousResult,
  );
  const [audioProgress, setAudioProgress] = useState(0);

  // --- 录音相关 Refs ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioDataRef = useRef<Float32Array[]>([]);

  // --- 播放相关 Refs ---
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // 监听 currentPlayingId 变化
  useEffect(() => {
    if (currentPlayingId !== null && currentPlayingId !== subtitle.id) {
      stopAudio();
    }
  }, [currentPlayingId, subtitle.id]);

  // 组件卸载清理
  useEffect(() => {
    return () => {
      stopAudio();
      stopRecordingCleanup();
    };
  }, []);

  const stopAudio = () => {
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
      audioInstanceRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setAudioProgress(0);
  };

  const stopRecordingCleanup = () => {
    // 停止处理节点
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    // 停止上下文
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    // 停止流
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startRecording = async () => {
    stopAudio();
    setResult(undefined);
    audioDataRef.current = []; // 清空之前的录音数据

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 创建 AudioContext，强制采样率 16000 (有道 API 要求)
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext!)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      // 使用 ScriptProcessorNode 获取音频数据
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // 必须深拷贝数据
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

    // 1. 停止录音并清理硬件占用
    stopRecordingCleanup();

    try {
      // 2. 合并音频数据
      const buffers = audioDataRef.current;
      if (buffers.length === 0) {
        throw new Error("No audio recorded");
      }
      const totalLength = buffers.reduce((acc, curr) => acc + curr.length, 0);
      const mergedBuffer = new Float32Array(totalLength);
      let offset = 0;
      for (const buffer of buffers) {
        mergedBuffer.set(buffer, offset);
        offset += buffer.length;
      }

      // 3. 编码为 WAV (16kHz, 16bit, Mono)
      const wavBlob = encodeWAV(mergedBuffer, 16000);

      // 4. 转 Base64
      const reader = new FileReader();
      reader.readAsDataURL(wavBlob);
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(",")[1];

        // 5. 调用 Server Action
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

        const score = Math.round(response.score || 0);

        // --- 核心修改部分 Start ---
        // 解析 response.details.words 来获取评测返回的单词序列
        let speechText = "";

        if (response.details && Array.isArray(response.details.words)) {
          // 将单词数组拼接成字符串
          // 可以在这里根据 word.score 判断是否需要标记颜色（例如低分词用红字），
          // 但这里先仅提取纯文本用于存储和展示。
          speechText = response.details.words
            .map((w: { word: string; score?: number }) => w.word)
            .join(" ");
        }

        console.log("Speech Text:", speechText);

        // 兜底逻辑：如果解析结果为空（例如API结构变动或静音），回退到原文
        if (!speechText || speechText.trim().length === 0) {
          speechText = subtitle.textEn;
        }
        // --- 核心修改部分 End ---

        const newResult: SpeechPracticeRecord = {
          recognitionid: Date.now(),
          userid: "current",
          episodeid: "current",
          speechText: speechText,
          accuracyScore: score,
          targetText: subtitle.textEn,
          targetStartTime: subtitle.startSeconds,
          recognitionDate: new Date().toISOString(),
        };

        setResult(newResult);
        onEvaluate(subtitle.id, speechText, score);
      };
    } catch (err) {
      console.error("Processing error:", err);
      setIsProcessing(false);
      toast.error("评测处理失败");
    }
  };

  const playReferenceAudio = () => {
    stopAudio();
    onPlayStart(subtitle.id);

    const audio = new Audio(audioUrl);
    audioInstanceRef.current = audio;

    const startTime = subtitle.startSeconds;
    const endTime = subtitle.endSeconds || startTime + 3;
    const duration = endTime - startTime;

    audio.currentTime = startTime;
    audio.play().catch((err) => console.error("Play error:", err));

    const tick = () => {
      if (!audio) return;
      if (audio.paused && audio.currentTime === 0) {
        stopAudio();
        return;
      }

      const current = audio.currentTime;
      if (current >= endTime) {
        audio.pause();
        setAudioProgress(0);
        audioInstanceRef.current = null;
        return;
      }

      const progress = Math.min(
        100,
        Math.max(0, ((current - startTime) / duration) * 100),
      );
      setAudioProgress(progress);
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 70) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-rose-600 bg-rose-50 border-rose-200";
  };

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
            className="shrink-0 w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            {audioProgress > 0 ? (
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
                    strokeDashoffset={113 - (113 * audioProgress) / 100}
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
      <div className="p-6 bg-slate-50/50 min-h-[140px] flex flex-col justify-center">
        {!isRecording && !isProcessing && (
          <div className="flex items-center justify-between">
            {result ? (
              <div className="flex-1 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
                <div
                  className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 ${getScoreColor(
                    result.accuracyScore || 0,
                  )}`}
                >
                  <span className="text-lg font-bold">
                    {Math.round(result.accuracyScore || 0)}
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-wider">
                    Score
                  </span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase text-slate-400">
                      You said:
                    </span>
                  </div>
                  <p
                    className={`text-base ${
                      (result.accuracyScore || 0) > 80
                        ? "text-slate-700"
                        : "text-slate-500"
                    }`}
                  >
                    {result.speechText}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 text-center text-slate-400 py-2">
                <p className="text-sm">点击麦克风开始跟读练习</p>
              </div>
            )}

            <button
              onClick={startRecording}
              className={`ml-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 ${
                result
                  ? "bg-white text-indigo-600 border border-indigo-100"
                  : "bg-indigo-600 text-white"
              }`}
            >
              {result ? <RotateCcw size={24} /> : <Mic size={24} />}
            </button>
          </div>
        )}

        {isRecording && (
          <div className="flex flex-col items-center justify-center py-2 space-y-4">
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
              正在录音...点击停止
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

        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <Cpu className="text-indigo-600 animate-spin" size={32} />
            <p className="text-sm font-bold text-indigo-600">正在分析发音……</p>
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
