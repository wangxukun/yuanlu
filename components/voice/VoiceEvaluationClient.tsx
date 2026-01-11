"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mic,
  Trophy,
  Activity,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import SpeechEvaluationCard from "./SpeechEvaluationCard";
import { saveSpeechResult } from "@/lib/actions/speech";
import { Episode } from "@/core/episode/episode.entity";
import { Subtitle, SpeechPracticeRecord } from "@/lib/types"; // 引入 Server Action

interface VoiceEvaluationClientProps {
  episode: Episode;
  subtitles: Subtitle[];
  previousRecords: SpeechPracticeRecord[];
}

const VoiceEvaluationClient: React.FC<VoiceEvaluationClientProps> = ({
  episode,
  subtitles,
  previousRecords,
}) => {
  const router = useRouter();

  // Local state to store new attempts in this session
  const [sessionRecords, setSessionRecords] =
    useState<SpeechPracticeRecord[]>(previousRecords);

  const stats = useMemo(() => {
    // 简单的统计逻辑，可以根据需求优化去重逻辑
    const attempts = sessionRecords.length;
    const avgScore =
      attempts > 0
        ? sessionRecords.reduce(
            (acc, curr) => acc + (curr.accuracyScore || 0),
            0,
          ) / attempts
        : 0;

    // Count unique sentences practiced (based on start time)
    const uniqueIds = new Set(sessionRecords.map((r) => r.targetStartTime))
      .size;
    const progress = Math.min(
      100,
      (uniqueIds / Math.max(subtitles.length, 1)) * 100,
    );

    return { attempts, avgScore, progress, uniqueIds };
  }, [sessionRecords, subtitles]);

  const handleEvaluation = async (
    subtitleId: number,
    recordedText: string,
    score: number,
  ) => {
    const targetSub = subtitles.find((s) => s.id === subtitleId);
    if (!targetSub) return;

    // 1. Optimistic Update (立即更新 UI)
    const newRecord: SpeechPracticeRecord = {
      recognitionid: Date.now(), // 临时 ID
      userid: "current",
      episodeid: episode.episodeid,
      speechText: recordedText,
      accuracyScore: score,
      targetText: targetSub.textEn,
      targetStartTime: targetSub.startSeconds,
      recognitionDate: new Date().toISOString(),
    };

    setSessionRecords((prev) => [...prev, newRecord]);

    // 2. Call Server Action (后台保存)
    const result = await saveSpeechResult(
      episode.episodeid,
      targetSub.textEn,
      recordedText,
      score,
      targetSub.startSeconds,
    );

    if (result.error) {
      toast.error("Failed to save progress");
      // 可选：回滚状态
    } else {
      toast.success("Result saved!");
    }
  };

  // 用于获取特定字幕的*最新*结果的辅助函数。
  const getLatestResult = (subtitleId: number) => {
    const targetSub = subtitles.find((s) => s.id === subtitleId);
    if (!targetSub) return undefined;

    // Find records matching this start time
    return [...sessionRecords]
      .filter(
        (r) =>
          Math.abs((r.targetStartTime || 0) - targetSub.startSeconds) < 0.5,
      ) // 允许 0.5s 误差
      .sort(
        (a, b) =>
          new Date(b.recognitionDate || 0).getTime() -
          new Date(a.recognitionDate || 0).getTime(),
      )[0];
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-indigo-900 text-white pt-8 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Mic size={300} />
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <button
            onClick={() => router.back()}
            className="flex items-center text-indigo-200 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={20} className="mr-2" />
            返回剧集
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">口语练习</h1>
              <p className="text-indigo-200 text-lg max-w-2xl">
                跟读模式：{" "}
                <span className="text-white font-medium">{episode.title}</span>
              </p>
            </div>

            {/* Session Stats */}
            <div className="flex gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 min-w-[120px]">
                <div className="flex items-center gap-2 text-indigo-200 text-xs uppercase font-bold tracking-wider mb-1">
                  <Trophy size={14} /> 平均分
                </div>
                <div className="text-2xl font-bold">
                  {Math.round(stats.avgScore)}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 min-w-[120px]">
                <div className="flex items-center gap-2 text-indigo-200 text-xs uppercase font-bold tracking-wider mb-1">
                  <Activity size={14} /> 进度
                </div>
                <div className="text-2xl font-bold">
                  {Math.round(stats.progress)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
        {/* Info Banner */}
        <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-4 mb-8 flex items-start gap-3">
          <Info className="text-indigo-600 shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-slate-600">
            <p className="font-bold text-slate-800 mb-1">如何使用跟读模式：</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>首先点击扬声器图标聆听参考音频。</li>
              <li>点击麦克风按钮，立即重复句子。</li>
              <li>查看您的准确率得分和发音反馈。目标是达到80分以上！</li>
            </ul>
          </div>
        </div>

        {/* Practice Cards */}
        <div className="space-y-6">
          {subtitles.length > 0 ? (
            subtitles.map((sub, index) => (
              <div key={sub.id} className="relative">
                {/* Connector Line */}
                {index !== subtitles.length - 1 && (
                  <div className="absolute left-8 top-full h-6 w-0.5 bg-slate-200 z-0 hidden md:block"></div>
                )}

                <div className="flex gap-4">
                  {/* Number Indicator (Desktop) */}
                  <div className="hidden md:flex flex-col items-center shrink-0 w-16 pt-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm border-2 border-white shadow-sm z-10">
                      {index + 1}
                    </div>
                  </div>

                  {/* Card */}
                  <div className="flex-1 min-w-0">
                    <SpeechEvaluationCard
                      subtitle={sub}
                      audioUrl={episode.audioUrl}
                      previousResult={getLatestResult(sub.id)}
                      onEvaluate={handleEvaluation}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500 bg-white rounded-xl">
              本集没有字幕。练习模式需要字幕。
            </div>
          )}
        </div>

        {/* Completion State */}
        {stats.progress >= 100 && subtitles.length > 0 && (
          <div className="mt-12 text-center py-12 bg-white rounded-3xl border border-dashed border-emerald-200 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={40} className="text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              会话已完成！
            </h2>
            <p className="text-slate-500 mb-6">
              你已经练习了这段视频里的每一句话。做得好！
            </p>
            <button
              onClick={() => router.back()}
              className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              返回剧集
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceEvaluationClient;
