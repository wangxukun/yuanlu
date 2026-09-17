/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Crown,
} from "lucide-react";
import SpeechEvaluationCard from "@/components/voice/SpeechEvaluationCard";
import { saveSpeechResult } from "@/lib/actions/speech";
import { useUIStore } from "@/store/ui-store";
import { toast } from "sonner";
import { useNotebookBase } from "@/lib/notebook-base";
import { FREE_VISIBLE_ERRORS } from "@/lib/quota";

export default function PronunciationPracticePage() {
  const router = useRouter();
  // 返回发音弱项本的绝对路径前缀：从 /review 分支进入则回到复习中心（Top Tabs 常驻）
  const base = useNotebookBase("pronunciation");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState<Record<number, boolean>>({});
  // [P2-4/N1] "已达标"判定与弱项列表生成共用同一分数线（user_profile.weakScoreThreshold）。
  // 80 仅为接口返回前的初始值（与 service 默认一致），加载后立即被 weakThreshold 覆盖
  const [threshold, setThreshold] = useState(80);
  // [P3-c] 整页 403 锁退役：非会员 errors 接口返回前 3 条试用切片（isTrialMode），
  // 题源即免费可见弱项，每日免费闯约 1 关，评测额度随 P3-b 复习日池
  const [totalErrors, setTotalErrors] = useState(0);
  const [isTrialMode, setIsTrialMode] = useState(false);
  // [P3-c] 复习日池预检：入口提示剩余次数避免半路触墙；触墙后评分按钮置锁
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [quotaIsPremium, setQuotaIsPremium] = useState(true);

  const refreshQuota = useCallback(() => {
    fetch("/api/speech/quota?scenario=review")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.success && d.data) {
          setQuotaRemaining(d.data.remaining);
          setQuotaExhausted(!!d.data.exhausted);
          setQuotaIsPremium(!!d.data.isPremium);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/speech/errors")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          setRecords(data.data);
          // [P2-4/N1] 接口回传实际生效的分数线，消除硬编码 80 的口径分叉
          if (typeof data.weakThreshold === "number") {
            setThreshold(data.weakThreshold);
          }
          // [P3-c] 切片协议：免费用户 data 已是前 3 条，totalErrors 为全量数
          if (typeof data.totalErrors === "number") {
            setTotalErrors(data.totalErrors);
          }
          setIsTrialMode(!!data.isTrialMode);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
    refreshQuota();
  }, [refreshQuota]);

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

    // [P3-c] 每次评测落库后刷新日池余量（入口提示与置锁态随之更新）
    refreshQuota();

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
  const isLast = currentIndex === records.length - 1;
  // [P3-c] 结算判定：试用模式走到最后一题 → 成就先行 + "下一关"转 PRO（弹
  // pronunciation_locked，锁定卡职责仍在列表页，两层职责分离）
  const lockedCount = Math.max(0, totalErrors - records.length);
  const showSettlement = isLast && isTrialMode;
  const completedCount = Object.values(completed).filter(Boolean).length;

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
        <div className="flex items-center gap-4 mb-4">
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

        {/* [P3-c] 日池余量入口提示：进入即知今日还能评几次，避免半路触墙。
            余量低于闯完一关的题量（FREE_VISIBLE_ERRORS 条）时转琥珀预警 */}
        {!quotaIsPremium && quotaRemaining !== null && (
          <div
            className={`mb-8 flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold ${
              quotaRemaining < FREE_VISIBLE_ERRORS
                ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                : "bg-base-200/70 text-base-content/60 dark:bg-ink-800"
            }`}
          >
            {quotaRemaining < FREE_VISIBLE_ERRORS && <Crown size={13} />}
            今日剩余 {quotaRemaining} 次免费评测
            {quotaRemaining < FREE_VISIBLE_ERRORS && "，明日额度自动就位"}
          </div>
        )}

        <div className="w-full bg-base-200 h-1.5 rounded-full mb-12 overflow-hidden">
          <div
            className="h-full bg-primary-600 dark:bg-primary-400 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / records.length) * 100}%` }}
          />
        </div>

        {/* [P3-c] 结算"成就先行"：先给正反馈（今日攻克 N/3），
            升级引导随其后（下一关按钮转 PRO，见底部导航区） */}
        {showSettlement && (
          <div className="mb-6 rounded-2xl border border-success/30 bg-success/5 dark:bg-success/10 px-5 py-4 flex items-center gap-4 animate-in zoom-in">
            <div className="text-3xl">🎉</div>
            <div className="flex-1">
              <p className="font-bold text-base-content">
                今日攻克 {completedCount}/{records.length}
              </p>
              <p className="text-xs text-base-content/60 mt-0.5">
                还有 {lockedCount} 条弱项句子待攻克，继续闯关精准消灭发音弱点
              </p>
            </div>
          </div>
        )}

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
            quotaLocked={quotaExhausted}
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

          {isLast ? (
            showSettlement ? (
              // [P3-c] 试用结算："下一关"转 PRO 样式，弹 pronunciation_locked
              //（openPremiumModal 内置 PREMIUM_MODAL_OPEN 埋点，验收红线）
              <button
                onClick={() =>
                  useUIStore
                    .getState()
                    .openPremiumModal("pronunciation_locked", {
                      totalErrors: lockedCount,
                    })
                }
                className="btn gap-2 rounded-full border-0 bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600"
              >
                <Crown size={16} /> 下一关 · 解锁 PRO
              </button>
            ) : (
              <button
                onClick={handleExit}
                className="btn btn-primary bg-primary-600 text-white gap-2 shadow-lg shadow-primary-600/20 dark:shadow-primary-400/20"
              >
                完成复习
              </button>
            )
          ) : (
            <button
              onClick={nextRecord}
              className="btn btn-primary bg-primary-600 text-white gap-2 shadow-lg shadow-primary-600/20 dark:shadow-primary-400/20"
            >
              下一题 <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
