"use client";

/**
 * [P3-i②] AI 剧集深度精讲面板（PRO 专属，挂载于剧集详情页 ShowNotes 之后）。
 *
 * 分层：免费层是剧集页既有内容（标题/介绍/文稿预览——获客面保持免费）；
 * 深度精讲（难点词汇预扫/长难句拆解/跟读句推荐/理解测验）为 PRO 增量。
 * 免费点击锁定卡 → PremiumModal（source episode_deep_dive，openPremiumModal
 * 内置 PREMIUM_MODAL_OPEN 埋点，验收红线）；服务端另有会员门禁兜底（403
 * 时同样弹窗承接）。LLM 生成失败 toast 提示，不阻断剧集页。
 */

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Headphones,
  ListChecks,
  Loader2,
  Lock,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useUIStore } from "@/store/ui-store";

interface DeepDiveContent {
  vocabulary: {
    word: string;
    phonetic?: string;
    meaning: string;
    reason?: string;
  }[];
  sentences: { text: string; analysis: string }[];
  shadowing: { text: string; reason?: string }[];
  quiz: {
    question: string;
    options: string[];
    answer: number;
    explanation?: string;
  }[];
}

const FEATURE_CHIPS = [
  { icon: BookOpen, text: "难点词汇预扫" },
  { icon: ListChecks, text: "长难句拆解" },
  { icon: Headphones, text: "跟读句推荐" },
  { icon: Sparkles, text: "理解测验" },
];

export default function EpisodeDeepDive({ episodeid }: { episodeid: string }) {
  const { data: session } = useSession();
  const [content, setContent] = useState<DeepDiveContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isPremiumClient =
    session?.user?.role === "PREMIUM" || session?.user?.role === "ADMIN";

  const load = async () => {
    if (content || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/episode/deep-dive?episodeid=${episodeid}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setContent(json.data.content as DeepDiveContent);
        return;
      }
      if (res.status === 403 || json?.code === "PREMIUM_REQUIRED") {
        // 免费锁定或会员态过期缝隙：弹窗承接（埋点内置）
        useUIStore.getState().openPremiumModal("episode_deep_dive");
        return;
      }
      toast.warning(json?.message || "AI 精讲生成失败，请稍后重试");
    } catch {
      toast.warning("网络异常，AI 精讲加载失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    if (!session?.user) {
      toast.error("AI 精讲仅对会员开放，请先登录");
      return;
    }
    if (!isPremiumClient) {
      useUIStore.getState().openPremiumModal("episode_deep_dive");
      return;
    }
    void load();
  };

  // ── 已加载：渲染精讲内容 ──
  if (content) {
    return (
      <section className="rounded-2xl bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 p-6 md:p-8 flex flex-col gap-8">
        <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-50 flex items-center gap-2">
          <Sparkles size={24} className="text-violet-500" />
          AI 精讲本集
        </h2>

        {content.vocabulary.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-base-content/50 uppercase tracking-widest mb-3">
              难点词汇预扫
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {content.vocabulary.map((v, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-ink-100 dark:border-ink-800 bg-ink-50/50 dark:bg-ink-950/40 px-4 py-3"
                >
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-bold text-primary-700 dark:text-primary-300">
                      {v.word}
                    </span>
                    {v.phonetic && (
                      <span className="text-xs text-base-content/40 font-mono">
                        {v.phonetic}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-base-content/80 mt-1">
                    {v.meaning}
                  </p>
                  {v.reason && (
                    <p className="text-xs text-base-content/50 mt-1">
                      {v.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {content.sentences.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-base-content/50 uppercase tracking-widest mb-3">
              长难句拆解
            </h3>
            <div className="space-y-4">
              {content.sentences.map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl border-l-4 border-violet-400 bg-violet-50/40 dark:bg-violet-500/5 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-ink-800 dark:text-ink-200 leading-relaxed">
                    {s.text}
                  </p>
                  <p className="text-sm text-base-content/70 mt-2 leading-relaxed">
                    {s.analysis}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.shadowing.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-base-content/50 uppercase tracking-widest mb-3">
              本集跟读句推荐
            </h3>
            <div className="space-y-2">
              {content.shadowing.map((s, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Headphones
                    size={16}
                    className="text-primary-500 shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-ink-800 dark:text-ink-200">
                      {s.text}
                    </p>
                    {s.reason && (
                      <p className="text-xs text-base-content/50 mt-0.5">
                        {s.reason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.quiz.length > 0 && <QuizBlock quiz={content.quiz} />}
      </section>
    );
  }

  // ── 未加载：入口卡（免费锁定态 / PRO 加载态） ──
  return (
    <section className="rounded-2xl bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 p-6 md:p-8">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="w-full text-left group"
        aria-label="AI 精讲本集"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-primary-500 text-white shadow-md group-hover:scale-105 transition-transform">
            {isLoading ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <Sparkles size={22} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-bold text-ink-900 dark:text-ink-50">
                AI 精讲本集
              </h2>
              {!isPremiumClient && session?.user && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[11px] font-bold">
                  PRO
                </span>
              )}
            </div>
            <p className="text-sm text-base-content/60 mt-1">
              {isLoading
                ? "AI 正在精读字幕并生成精讲内容，首次生成约需 30-60 秒..."
                : "AI 精读本集字幕，生成专属精讲：难点词汇、长难句拆解、跟读句与理解测验。"}
            </p>
          </div>
          {!isPremiumClient && session?.user && (
            <Lock size={18} className="text-amber-500 shrink-0" />
          )}
          {isPremiumClient && !isLoading && (
            <ChevronDown
              size={20}
              className="text-base-content/40 shrink-0 group-hover:text-base-content transition-colors"
            />
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {FEATURE_CHIPS.map((chip) => (
            <span
              key={chip.text}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink-50 dark:bg-ink-950/60 text-xs font-bold text-base-content/70"
            >
              <chip.icon size={13} />
              {chip.text}
            </span>
          ))}
        </div>
      </button>
    </section>
  );
}

/** 测验块：选择后即时反馈（正确/错误 + 解析） */
function QuizBlock({ quiz }: { quiz: DeepDiveContent["quiz"] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  return (
    <div>
      <h3 className="text-sm font-bold text-base-content/50 uppercase tracking-widest mb-3">
        理解测验
      </h3>
      <div className="space-y-5">
        {quiz.map((q, qi) => {
          const picked = answers[qi];
          return (
            <div
              key={qi}
              className="rounded-xl border border-ink-100 dark:border-ink-800 px-4 py-4"
            >
              <p className="text-sm font-bold text-base-content mb-3">
                {qi + 1}. {q.question}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {q.options.map((opt, oi) => {
                  const isPicked = picked === oi;
                  const isCorrect = q.answer === oi;
                  const showState = picked !== undefined;
                  return (
                    <button
                      key={oi}
                      type="button"
                      disabled={showState}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [qi]: oi }))
                      }
                      className={`flex items-center gap-2 text-left px-3.5 py-2.5 rounded-lg border text-sm transition-colors ${
                        showState && isCorrect
                          ? "border-success-300 dark:border-success-700 bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400 font-semibold"
                          : showState && isPicked && !isCorrect
                            ? "border-error-300 dark:border-error-700 bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400"
                            : "border-ink-200 dark:border-ink-700 hover:border-primary-300 dark:hover:border-primary-700 text-base-content/80"
                      } ${showState ? "cursor-default" : "cursor-pointer"}`}
                    >
                      {showState && isCorrect ? (
                        <CheckCircle2 size={16} className="shrink-0" />
                      ) : showState && isPicked ? (
                        <XCircle size={16} className="shrink-0" />
                      ) : (
                        <span className="w-4 text-center text-xs font-bold text-base-content/40 shrink-0">
                          {String.fromCharCode(65 + oi)}
                        </span>
                      )}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
              {picked !== undefined && q.explanation && (
                <p className="text-xs text-base-content/60 mt-3 bg-ink-50 dark:bg-ink-950/50 rounded-lg px-3 py-2">
                  {q.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
