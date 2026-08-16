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
  Lock,
} from "lucide-react";
import SpeechEvaluationCard from "@/components/voice/SpeechEvaluationCard";
import { saveSpeechResult } from "@/lib/actions/speech";
import { useUIStore } from "@/store/ui-store";
import { toast } from "sonner";

export default function PronunciationPracticePage() {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch("/api/speech/errors")
      .then(async (res) => {
        // 弱项练习为 PRO 会员功能（与弱项本页面锁定态一致）
        if (res.status === 403) {
          setLocked(true);
          setLoading(false);
          return { success: false };
        }
        return res.json();
      })
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
      toast.error(
        "message" in result && result.message ? result.message : "保存进度失败",
      );
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
      <div className="bg-ink-50 dark:bg-ink-900 min-h-screen flex justify-center items-center transition-colors duration-300">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (locked) {
    return (
      <div className="bg-ink-50 dark:bg-ink-900 min-h-screen flex flex-col justify-center items-center gap-4 text-center px-4 transition-colors duration-300">
        <div className="w-16 h-16 bg-primary/10 text-primary flex items-center justify-center rounded-full mb-4">
          <Lock size={28} />
        </div>
        <h2 className="text-2xl font-bold">弱项练习是 PRO 会员功能</h2>
        <p className="text-base-content/60 max-w-sm">
          升级会员解锁发音诊断、弱项句子收录与针对性循环练习。
        </p>
        <button
          onClick={() =>
            useUIStore.getState().openPremiumModal("pronunciation_locked")
          }
          className="btn btn-primary bg-primary-600 text-white shadow-lg shadow-primary/20 mt-4 rounded-full px-8 border-0"
        >
          解锁 PRO 会员
        </button>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="bg-ink-50 dark:bg-ink-900 min-h-screen flex flex-col justify-center items-center gap-4 text-center transition-colors duration-300">
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
    endSeconds:
      currentRecord.subtitleEnd ?? (currentRecord.targetStartTime || 0) + 3,
    textEn: currentRecord.targetText,
    textCn: currentRecord.subtitleTextCn || "",
    words: currentRecord.subtitleWords,
  };

  return (
    <div className="bg-ink-50 dark:bg-ink-900 min-h-screen pb-20 transition-colors duration-300">
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
            className="btn btn-primary bg-primary-600 text-white gap-2 shadow-lg shadow-primary/20"
          >
            {currentIndex === records.length - 1 ? "完成复习" : "下一题"}{" "}
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
