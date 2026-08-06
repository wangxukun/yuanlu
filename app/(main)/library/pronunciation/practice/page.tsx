/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import SpeechEvaluationCard from "@/components/voice/SpeechEvaluationCard";
import { saveSpeechResult } from "@/lib/actions/speech";
import { toast } from "sonner";

export default function PronunciationPracticePage() {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch("/api/speech/errors")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          setRecords(data.data);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const handleEvaluate = async (
    subtitleId: number,
    recordedText: string,
    score: number,
    fullRecord?: any,
    rawDetails?: any,
    audioBase64?: string,
  ) => {
    // If they score high enough (e.g. >= 80), mark as completed
    if (score >= 80) {
      setCompleted((prev) => ({ ...prev, [currentIndex]: true }));
    }

    const currentRecord = records[currentIndex];
    if (!currentRecord) return;

    const result = await saveSpeechResult({
      episodeId: currentRecord.episodeid,
      targetText: currentRecord.targetText,
      speechText: recordedText,
      accuracyScore: score,
      targetStartTime: currentRecord.targetStartTime || 0,
      subtitleId: subtitleId,
      fluencyScore: fullRecord?.fluencyScore,
      integrityScore: fullRecord?.integrityScore,
      overallScore: fullRecord?.overallScore,
      speed: fullRecord?.speed,
      audioBase64: audioBase64,
      detailJson: rawDetails,
    });

    if (result.error) {
      toast.error("保存进度失败");
    }
  };

  const nextRecord = () => {
    if (currentIndex < records.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const prevRecord = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleExit = () => {
    router.push("/library/pronunciation");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] justify-center items-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col h-[70vh] justify-center items-center gap-4 text-center">
        <div className="w-16 h-16 bg-base-200 flex items-center justify-center rounded-full text-4xl mb-4">
          🎉
        </div>
        <h2 className="text-2xl font-bold">没有待复习的弱项</h2>
        <p className="text-base-content/60">您的发音记录非常完美，继续保持！</p>
        <button onClick={handleExit} className="btn mt-4">
          返回
        </button>
      </div>
    );
  }

  const currentRecord = records[currentIndex];
  const isCompleted = completed[currentIndex];

  const mockSubtitle = {
    id: currentRecord.subtitleId || currentRecord.recognitionid,
    startSeconds: currentRecord.targetStartTime || 0,
    endSeconds: (currentRecord.targetStartTime || 0) + 3, // rough estimate for sliced audio
    textEn: currentRecord.targetText,
    textZh: "弱项句子复习",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={handleExit} className="btn btn-circle btn-ghost">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold flex-1">
          发音闯关复习 ({currentIndex + 1}/{records.length})
        </h1>
        {isCompleted && (
          <span className="flex items-center gap-1.5 text-success font-bold text-sm bg-success/10 px-3 py-1 rounded-full animate-in zoom-in">
            <CheckCircle2 size={16} /> 已达标
          </span>
        )}
      </div>

      <div className="w-full bg-base-200 h-1.5 rounded-full mb-12 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / records.length) * 100}%` }}
        />
      </div>

      <div className="relative">
        <SpeechEvaluationCard
          subtitle={mockSubtitle}
          audioUrl={currentRecord.episode?.audioUrl || ""}
          previousResult={undefined} // don't load the old bad score, let them start fresh
          onEvaluate={handleEvaluate}
          currentPlayingId={null}
          onPlayStart={() => {}}
          isActive={true}
          onActivate={() => {}}
        />
      </div>

      <div className="flex items-center justify-between mt-12 px-2">
        <button
          onClick={prevRecord}
          disabled={currentIndex === 0}
          className="btn btn-ghost gap-2"
        >
          <ChevronLeft size={18} /> 上一题
        </button>

        <button
          onClick={
            currentIndex === records.length - 1 ? handleExit : nextRecord
          }
          className={`btn gap-2 ${isCompleted ? "btn-primary shadow-lg shadow-primary/20" : "btn-outline"}`}
        >
          {currentIndex === records.length - 1 ? "完成复习" : "下一题"}{" "}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
