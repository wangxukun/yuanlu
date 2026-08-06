/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import SpeechEvaluationCard from "./SpeechEvaluationCard";
import { saveSpeechResult } from "@/lib/actions/speech";
import { Episode } from "@/core/episode/episode.entity";
import { Subtitle, SpeechPracticeRecord } from "@/lib/types";
import { useUIStore } from "@/store/ui-store";

interface VoiceEvaluationClientProps {
  episode: Episode;
  subtitles: Subtitle[];
  previousRecords: SpeechPracticeRecord[];
  isTrialMode?: boolean;
}

const VoiceEvaluationClient: React.FC<VoiceEvaluationClientProps> = ({
  episode,
  subtitles,
  previousRecords,
  isTrialMode = false,
}) => {
  const router = useRouter();

  const [sessionRecords, setSessionRecords] =
    useState<SpeechPracticeRecord[]>(previousRecords);
  const [playingSubtitleId, setPlayingSubtitleId] = useState<number | null>(
    null,
  );

  // 用于 Theater Mode：记录当前正在练习的卡片
  const [activeCardId, setActiveCardId] = useState<number | null>(
    subtitles.length > 0 ? subtitles[0].id : null,
  );

  const stats = useMemo(() => {
    const attempts = sessionRecords.length;
    const uniqueIds = new Set(sessionRecords.map((r) => r.targetStartTime))
      .size;
    const progress = Math.min(
      100,
      (uniqueIds / Math.max(subtitles.length, 1)) * 100,
    );
    return { attempts, progress, uniqueIds };
  }, [sessionRecords, subtitles]);

  const handleEvaluation = async (
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

    setSessionRecords((prev) => [...prev, newRecord]);

    // 如果分数不错，1.5秒后自动跳到下一句 (Theater Mode)
    if (score >= 80) {
      const currentIndex = subtitles.findIndex((s) => s.id === subtitleId);
      if (currentIndex !== -1 && currentIndex < subtitles.length - 1) {
        setTimeout(() => {
          const nextId = subtitles[currentIndex + 1].id;
          setActiveCardId(nextId);
          // 可选平滑滚动
          document
            .getElementById(`card-${nextId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 1500);
      }
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
      toast.error("Failed to save progress");
    }
  };

  const getLatestResult = (subtitleId: number) => {
    const targetSub = subtitles.find((s) => s.id === subtitleId);
    if (!targetSub) return undefined;

    return [...sessionRecords]
      .filter(
        (r) =>
          Math.abs((r.targetStartTime || 0) - targetSub.startSeconds) < 0.5,
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

    return [...sessionRecords]
      .filter(
        (r) =>
          Math.abs((r.targetStartTime || 0) - targetSub.startSeconds) < 0.5,
      )
      .sort(
        (a, b) =>
          new Date(b.recognitionDate || 0).getTime() -
          new Date(a.recognitionDate || 0).getTime(),
      );
  };

  return (
    <div className="min-h-screen bg-base-200/40 pb-20 font-sans transition-colors duration-300">
      {/* Header - Duolingo Style Progress */}
      <div className="bg-base-100 border-b border-base-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="btn btn-ghost btn-circle text-base-content/70 hover:bg-base-200"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex-1 flex items-center gap-4 max-w-xl mx-auto">
            <div className="text-sm font-bold text-base-content/50 whitespace-nowrap hidden sm:block">
              口语练习
            </div>
            <div className="flex-1 relative h-3.5 bg-base-200 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 bottom-0 bg-primary transition-all duration-500 ease-out rounded-full"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
            <div className="text-sm font-bold text-base-content/70 whitespace-nowrap">
              {stats.uniqueIds} / {subtitles.length}
            </div>
          </div>

          <button className="btn btn-ghost btn-circle text-base-content/70 hover:bg-base-200">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-20">
        {/* Practice Cards (Theater Mode) */}
        <div className="space-y-6 md:space-y-10">
          {subtitles.length > 0 ? (
            subtitles.map((sub, index) => (
              <div key={sub.id} id={`card-${sub.id}`} className="scroll-mt-24">
                <div className="flex flex-col items-center">
                  <div className="w-full">
                    <SpeechEvaluationCard
                      subtitle={sub}
                      audioUrl={episode.audioUrl}
                      previousResult={getLatestResult(sub.id)}
                      historicalRecords={getHistoricalRecords(sub.id)}
                      onEvaluate={handleEvaluation}
                      currentPlayingId={playingSubtitleId}
                      onPlayStart={(id) => setPlayingSubtitleId(id)}
                      isActive={activeCardId === sub.id}
                      onActivate={() => {
                        setActiveCardId(sub.id);
                        document
                          .getElementById(`card-${sub.id}`)
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                      }}
                    />
                  </div>
                  {/* Connector indicator for active state */}
                  {index !== subtitles.length - 1 && (
                    <div className="h-6 w-1 bg-base-300 rounded-full my-2"></div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-base-content/50 bg-base-100 rounded-2xl border border-base-200 shadow-sm">
              本集没有字幕。练习模式需要字幕。
            </div>
          )}
        </div>

        {/* Completion State */}
        {isTrialMode ? (
          <div className="mt-16 text-center py-12 bg-base-100 rounded-3xl border border-primary/20 shadow-xl shadow-primary/5">
            <h2 className="text-2xl font-bold text-base-content mb-3">
              体验已结束
            </h2>
            <p className="text-base-content/60 mb-8 max-w-sm mx-auto">
              升级为 PRO 会员，解锁本集全部练习卡片及更多独家高级内容。
            </p>
            <button
              onClick={() => useUIStore.getState().openPremiumModal()}
              className="btn btn-primary btn-wide rounded-full shadow-lg shadow-primary/30"
            >
              解锁全部
            </button>
          </div>
        ) : (
          stats.progress >= 100 &&
          subtitles.length > 0 && (
            <div className="mt-16 text-center py-12 bg-base-100 rounded-3xl border border-dashed border-base-300 animate-in fade-in slide-in-from-bottom-4 shadow-xl">
              <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} className="text-success" />
              </div>
              <h2 className="text-2xl font-bold text-base-content mb-3">
                会话已完成！
              </h2>
              <p className="text-base-content/60 mb-8 max-w-sm mx-auto">
                你已经练习了这段视频里的每一句话。干得漂亮，继续保持！
              </p>
              <button
                onClick={() => router.back()}
                className="btn btn-primary btn-wide rounded-full shadow-lg shadow-primary/30"
              >
                返回剧集
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default VoiceEvaluationClient;
