"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, RotateCcw, Volume2, Cpu } from "lucide-react";
import { SpeechPracticeRecord, Subtitle } from "@/lib/types";

interface SpeechEvaluationCardProps {
  subtitle: Subtitle;
  audioUrl: string; // 接收音频文件地址
  previousResult?: SpeechPracticeRecord;
  onEvaluate: (subtitleId: number, recordedText: string, score: number) => void;
}

const SpeechEvaluationCard: React.FC<SpeechEvaluationCardProps> = ({
  subtitle,
  audioUrl,
  previousResult,
  onEvaluate,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<SpeechPracticeRecord | undefined>(
    previousResult,
  );
  const [audioProgress, setAudioProgress] = useState(0);

  // Simulation refs
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null); // 管理音频实例

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current)
        clearTimeout(recordingTimeoutRef.current);
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      // 组件卸载时停止播放音频
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
        audioInstanceRef.current = null;
      }
    };
  }, []);

  const startRecording = () => {
    // 停止正在播放的音频（如果用户一边听一边点录音）
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
      setAudioProgress(0);
    }

    setIsRecording(true);
    setResult(undefined); // Reset previous result while recording new

    // Simulate recording duration (auto-stop after 4 seconds)
    // TODO: Replace with real MediaRecorder API or Azure Speech SDK start
    recordingTimeoutRef.current = setTimeout(() => {
      stopRecording();
    }, 4000);
  };

  const stopRecording = () => {
    if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
    setIsRecording(false);
    setIsProcessing(true);

    // Simulate AI Processing delay
    // TODO: Replace with real API call to STT service
    setTimeout(() => {
      setIsProcessing(false);

      // Mock random "AI" logic for demonstration
      // 70% chance of high score, 30% random low score
      const randomScore =
        Math.random() > 0.3
          ? Math.floor(Math.random() * (100 - 85) + 85)
          : Math.floor(Math.random() * (85 - 50) + 50);

      // Simulate slight misrecognition if score is low
      let recognized = subtitle.textEn;
      if (randomScore < 90) {
        // Rudimentary "error" simulation: drop the last word
        const words = recognized.split(" ");
        if (words.length > 3) {
          words.pop();
          recognized = words.join(" ");
        }
      }

      // 构造临时结果对象 (ID 使用时间戳模拟)
      const newResult: SpeechPracticeRecord = {
        recognitionid: Date.now(),
        userid: "current",
        episodeid: "current",
        speechText: recognized,
        accuracyScore: randomScore,
        targetText: subtitle.textEn,
        targetStartTime: subtitle.startSeconds,
        recognitionDate: new Date().toISOString(),
      };

      setResult(newResult);
      onEvaluate(subtitle.id, recognized, randomScore);
    }, 1500);
  };

  // 实现真实的音频播放逻辑
  const playReferenceAudio = () => {
    // 1. 如果已有音频在播放，先停止
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
      audioInstanceRef.current = null;
    }
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);

    // 2. 创建新音频对象
    const audio = new Audio(audioUrl);
    audioInstanceRef.current = audio;

    // 3. 计算播放区间
    const startTime = subtitle.startSeconds;
    // 如果没有 endSeconds，默认播放 3 秒或根据实际情况调整
    const endTime = subtitle.endSeconds || startTime + 3;
    const duration = endTime - startTime;

    console.log(`Playing audio from ${startTime} to ${endTime}`);

    // 4. 设置起始点并播放
    audio.currentTime = startTime;

    // 处理加载可能存在的延迟
    audio.play().catch((err) => {
      console.error("Audio playback failed:", err);
      // 可以在这里加个 toast 提示音频无法播放
    });

    // 5. 开启进度检测
    setAudioProgress(0);
    audioIntervalRef.current = setInterval(() => {
      if (!audio) return;

      // 如果音频播放结束或人为暂停
      if (audio.paused && audio.currentTime === 0) {
        if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
        setAudioProgress(0);
        return;
      }

      const current = audio.currentTime;

      // 计算进度百分比 (0-100)
      // 使用 Math.max(0) 防止起始稍微有偏差导致负数
      const progress = Math.min(
        100,
        Math.max(0, ((current - startTime) / duration) * 100),
      );
      setAudioProgress(progress);

      // 到达结束时间，停止播放
      if (current >= endTime) {
        audio.pause();
        setAudioProgress(0);
        if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
        audioInstanceRef.current = null;
      }
    }, 50); // 50ms 更新一次以保证流畅
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
            // 只要 audioProgress > 0 就视为正在播放，禁用按钮防止重复点击
            disabled={audioProgress > 0}
            className="shrink-0 w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            {audioProgress > 0 ? (
              <div className="w-10 h-10 relative flex items-center justify-center">
                {/* 进度环 SVG */}
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
        {/* State: IDLE or RESULT present */}
        {!isRecording && !isProcessing && (
          <div className="flex items-center justify-between">
            {result ? (
              <div className="flex-1 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
                {/* Score Badge */}
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

                {/* Recognized Text */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase text-slate-400">
                      AI Heard:
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
                  {result.speechText !== subtitle.textEn && (
                    <p className="text-xs text-rose-500 mt-1 flex items-center">
                      检测到单词不匹配
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 text-center text-slate-400 py-2">
                <p className="text-sm">点击麦克风开始跟读练习</p>
              </div>
            )}

            {/* Mic Action */}
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

        {/* State: RECORDING */}
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

        {/* State: PROCESSING */}
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

export default SpeechEvaluationCard;
