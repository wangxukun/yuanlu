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
import { useNotebookBase } from "@/lib/notebook-base";

export default function PronunciationPracticePage() {
  const router = useRouter();
  // 返回发音弱项本的绝对路径前缀：从 /review 分支进入则回到复习中心（Top Tabs 常驻）
  const base = useNotebookBase("pronunciation");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState<Record<number, boolean>>({});
  // [P2-4/N1] "已达标"判定与弱项列表生成共用同一分数线（user_profile.weakScoreThreshold）。
  // 80 仅为接口返回前的初始值（与 service 默认一致），加载后立即被 weakThreshold 覆盖
  const [threshold, setThreshold] = useState(80);

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
          // [P2-4/N1] 接口回传实际生效的分数线，消除硬编码 80 的口径分叉
          if (typeof data.weakThreshold === "number") {
            setThreshold(data.weakThreshold);
          }
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
    // [P2-4/N1] 达标 = 达到用户自己的弱项分数线（与列表生成口径对齐），不再硬编码 80
    if (score >= threshold) {
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
      // [P3-b] 弱项闯关属复习场景：计入复习日池（5 次/日）而非学新月池
      scenario: "review",
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
    router.push(base);
    router.refresh();
  };

  if (loading) {
    return (
      <div className="bg-ink-50 dark:bg-ink-900 min-h-screen flex justify-center items-center transition-colors duration-300">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    );
  }

  if (locked) {
    return (
      <div className="bg-ink-50 dark:bg-ink-900 min-h-screen flex flex-col justify-center items-center gap-4 text-center px-4 transition-colors duration-300">
        <div className="w-16 h-16 bg-primary-600/10 dark:bg-primary-400/10 text-primary-600 dark:text-primary-400 flex items-center justify-center rounded-full mb-4">
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
          className="btn btn-primary bg-primary-600 text-white shadow-lg shadow-primary-600/20 dark:shadow-primary-400/20 mt-4 rounded-full px-8 border-0"
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
            className="h-full bg-primary-600 dark:bg-primary-400 transition-all duration-300"
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
            episodeId={currentRecord.episodeid}
            evalScenario="review"
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
            className="btn btn-primary bg-primary-600 text-white gap-2 shadow-lg shadow-primary-600/20 dark:shadow-primary-400/20"
          >
            {currentIndex === records.length - 1 ? "完成复习" : "下一题"}{" "}
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
