"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { SavedSentenceItem } from "@/core/sentences/dto";
import SpeechEvaluationCard from "@/components/voice/SpeechEvaluationCard";
import { saveSpeechResult } from "@/lib/actions/speech";
import { SPEECH_QUOTA_EXCEEDED, REVIEW_EVAL_QUOTA_EXCEEDED } from "@/lib/quota";
import { useUIStore } from "@/store/ui-store";
import {
  getEpisodeSubtitlesData,
  type EpisodeSubtitleItem,
} from "@/lib/client/episode-audio";
import { useNotebookBase } from "@/lib/notebook-base";

interface SentenceShadowingPracticeProps {
  sentences: SavedSentenceItem[];
}

/**
 * AI 影子跟读评测（句子本模块）：
 * 页面骨架对齐发音弱项本闯关复习页（返回栏 + 进度条 + 评测卡 + 上下句切换），
 * 评测卡复用 SpeechEvaluationCard，录音结果保存链路与弱项练习一致。
 * 初始句由 ?subtitleId= 定位（来自刷句复习卡「跟读」入口）。
 */
export default function SentenceShadowingPractice({
  sentences,
}: SentenceShadowingPracticeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 返回链接的绝对路径前缀：从 /review 分支进入则回到复习中心（Top Tabs 常驻），
  // 从 /library 分支进入则回到独立句子本页
  const base = useNotebookBase("sentences");

  // 初始句定位：?id=（收藏句 id，句子本列表入口，最精准）优先，
  // ?subtitleId=（刷句复习卡入口）兜底；均未命中时从第一句开始
  const targetSentenceId = searchParams.get("id");
  const targetSubtitleId = searchParams.get("subtitleId");

  const [currentIndex, setCurrentIndex] = useState(() => {
    let idx = -1;
    if (targetSentenceId != null) {
      idx = sentences.findIndex((s) => String(s.id) === targetSentenceId);
    }
    if (idx < 0 && targetSubtitleId != null) {
      idx = sentences.findIndex(
        (s) => String(s.subtitleId) === targetSubtitleId,
      );
    }
    return idx >= 0 ? idx : 0;
  });
  const [audioUrl, setAudioUrl] = useState("");
  const [episodeSubtitles, setEpisodeSubtitles] = useState<
    EpisodeSubtitleItem[]
  >([]);
  const [audioLoading, setAudioLoading] = useState(true);
  // [P3-b] 复习日池预检：触墙则置锁评分按钮（避免半路触墙，报告 4.2-B）
  const [quotaLocked, setQuotaLocked] = useState(false);
  const refreshQuota = useCallback(() => {
    fetch("/api/speech/quota?scenario=review")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.success && d.data) setQuotaLocked(!!d.data.exhausted);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    refreshQuota();
  }, [refreshQuota]);

  const current = sentences[currentIndex];

  // 原音直链 + 字幕列表按剧集懒加载（同一接口，模块级缓存）。
  // 依赖必须是 episodeid 原始值：录音完成后 saveSpeechResult（server action）会
  // 触发当前路由服务端组件重渲染并下发新的 sentences 引用，若依赖 current 对象
  // 会导致 audioLoading 置真、评测卡整体卸载重挂，丢失刚生成的结果卡片。
  const currentEpisodeid = current?.episodeid;
  useEffect(() => {
    if (!currentEpisodeid) return;
    let cancelled = false;
    setAudioLoading(true);
    getEpisodeSubtitlesData(currentEpisodeid)
      .then(({ audioUrl: url, subtitles }) => {
        if (!cancelled) {
          setAudioUrl(url || "");
          setEpisodeSubtitles(subtitles);
          setAudioLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAudioUrl("");
          setEpisodeSubtitles([]);
          setAudioLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentEpisodeid]);

  // 按当前句 subtitleId 从剧集字幕中取词级时间戳（绝对秒），
  // 供评测卡音素诊断「原声」按钮精确播放对应单词片段
  const currentSubtitleWords = useMemo(() => {
    if (!current?.subtitleId) return undefined;
    return episodeSubtitles.find((s) => s.id === current.subtitleId)?.words;
  }, [episodeSubtitles, current?.subtitleId]);

  // 收藏句 → 评测卡 Subtitle 结构。
  // 以原始字段为依赖，保证 server action 刷新后 subtitle 对象引用稳定，
  // 不触发卡片内部按 subtitle 变化的状态同步。
  const subtitle = useMemo(
    () =>
      current
        ? {
            id: current.subtitleId ?? current.id,
            startSeconds: current.startTime,
            endSeconds: current.endTime,
            textEn: current.enText,
            textCn: current.zhText ?? "",
            words: currentSubtitleWords,
          }
        : null,
    [
      current?.id,
      current?.subtitleId,
      current?.startTime,
      current?.endTime,
      current?.enText,
      current?.zhText,
      currentSubtitleWords,
    ],
  );

  const handleEvaluate = async (
    subtitleId: number,
    recordedText: string,
    score: number,
    fullRecord?: {
      fluencyScore?: number;
      integrityScore?: number;
      overallScore?: number;
      speed?: number;
    },
    rawDetails?: unknown,
    audioBase64?: string,
  ) => {
    if (!current) return;

    const result = await saveSpeechResult({
      episodeId: current.episodeid,
      targetText: current.enText,
      speechText: recordedText,
      accuracyScore: score,
      targetStartTime: current.startTime,
      subtitleId: subtitleId,
      fluencyScore: fullRecord?.fluencyScore,
      integrityScore: fullRecord?.integrityScore,
      overallScore: fullRecord?.overallScore,
      speed: fullRecord?.speed,
      audioBase64: audioBase64,
      detailJson: rawDetails as never,
      // [P3-b] 句子本跟读属复习场景：计入复习日池（5 次/日）而非学新月池
      scenario: "review",
    });

    // 保存成功后刷新日池余量（used+1 可能触墙 → 置锁下一句评分按钮）
    refreshQuota();

    if (result.error) {
      // [P3-b] 保存兜底触墙（并发/绕过评测接口）：同样走弹窗承接，不再只弹错误 toast
      if (
        result.error === SPEECH_QUOTA_EXCEEDED ||
        result.error === REVIEW_EVAL_QUOTA_EXCEEDED
      ) {
        const quotaMessage =
          "message" in result && result.message
            ? result.message
            : "今日免费跟读评测已用完";
        toast.error(quotaMessage);
        useUIStore
          .getState()
          .openPremiumModal(
            result.error === REVIEW_EVAL_QUOTA_EXCEEDED
              ? "review_eval_quota"
              : "speech_quota",
          );
        return;
      }
      toast.error(
        "message" in result && result.message ? result.message : "保存进度失败",
      );
    }
  };

  const handleExit = () => {
    router.push(base);
    router.refresh();
  };

  // 返回滑动卡片复习，携带当前句 subtitleId 供复习页深链定位对应卡片
  const handleBackToDeck = () => {
    router.push(
      current?.subtitleId != null
        ? `${base}/review?subtitleId=${current.subtitleId}`
        : `${base}/review`,
    );
  };

  const nextSentence = () => {
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const prevSentence = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (!current || !subtitle) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center gap-4 text-center px-4">
        <div className="w-16 h-16 bg-base-200 flex items-center justify-center rounded-full text-4xl mb-4">
          📝
        </div>
        <h2 className="text-2xl font-bold">没有可跟读的句子</h2>
        <p className="text-base-content/60">
          先去句子本收藏几个句子再来练习吧。
        </p>
        <button onClick={handleExit} className="btn mt-4">
          返回句子本
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-20">
      {/* 标题栏：返回句子本 + 进度 */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={handleExit} className="btn btn-circle btn-ghost">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold flex-1">
          AI 影子跟读评测 ({currentIndex + 1}/{sentences.length})
        </h1>
      </div>

      {/* 进度条 */}
      <div className="w-full bg-base-200 h-1.5 rounded-full mb-12 overflow-hidden">
        <div
          className="h-full bg-primary-600 dark:bg-primary-400 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / sentences.length) * 100}%` }}
        />
      </div>

      {/* 评测卡（复用语音评测卡片；onExit 启用结果区「返回句子本」按钮） */}
      {audioLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      ) : (
        <SpeechEvaluationCard
          key={current.id}
          subtitle={subtitle}
          audioUrl={audioUrl}
          previousResult={undefined}
          onEvaluate={handleEvaluate}
          currentPlayingId={null}
          onPlayStart={() => {}}
          isActive={true}
          onActivate={() => {}}
          episodeId={current.episodeid}
          episodeTitle={current.episodeTitle}
          onExit={handleExit}
          onBackToDeck={handleBackToDeck}
          evalScenario="review"
          quotaLocked={quotaLocked}
        />
      )}

      {/* 上一句 / 下一句 */}
      <div className="flex items-center justify-between mt-12 px-2">
        <button
          onClick={prevSentence}
          disabled={currentIndex === 0}
          className="btn btn-ghost gap-2"
        >
          <ChevronLeft size={18} /> 上一句
        </button>

        <button
          onClick={
            currentIndex === sentences.length - 1 ? handleExit : nextSentence
          }
          className="btn btn-primary bg-primary-600 text-white gap-2 shadow-lg shadow-primary-600/20 dark:shadow-primary-400/20"
        >
          {currentIndex === sentences.length - 1 ? "完成跟读" : "下一句"}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
