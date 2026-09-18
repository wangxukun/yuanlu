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

import React, { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
  const [isOpen, setIsOpen] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);

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
        setIsOpen(true);
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
    // Content already loaded — toggle open/close
    if (content) {
      setIsOpen((prev) => !prev);
      return;
    }
    void load();
  };

  /** Collapse and scroll back to the card top */
  const handleCollapse = () => {
    setIsOpen(false);
    // Scroll the card header into viewport after collapse
    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  // ── 已加载：渲染精讲内容（可折叠） ──
  if (content) {
    return (
      <section
        ref={sectionRef}
        className="rounded-2xl bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 shadow-sm overflow-hidden scroll-mt-24"
      >
        {/* ── Header（始终可见，点击 toggle 开合） ── */}
        <button
          type="button"
          onClick={() => {
            if (isOpen) handleCollapse();
            else setIsOpen(true);
          }}
          className="w-full text-left p-6 md:p-8 flex items-center gap-3 group cursor-pointer"
          aria-expanded={isOpen}
          aria-label="AI 精讲本集"
        >
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-primary-500 text-white shadow-md group-hover:scale-105 transition-transform">
            <Sparkles size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-bold text-ink-900 dark:text-ink-50">
                AI 精讲本集
              </h2>
            </div>
            <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">
              AI
              精读本集字幕，生成专属精讲：难点词汇、长难句拆解、跟读句与理解测验。
            </p>
          </div>
          <div className="text-ink-400 group-hover:text-ink-600 dark:group-hover:text-ink-300 transition-colors shrink-0">
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>

        {/* ── Expandable Content ── */}
        {isOpen && (
          <div className="px-6 md:px-8 pb-6 md:pb-8 flex flex-col gap-8">
            {/* ── 难点词汇预扫 ── */}
            {content.vocabulary.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-ink-500 dark:text-ink-400 uppercase tracking-widest mb-4">
                  难点词汇预扫
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {content.vocabulary.map((v, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-ink-50 dark:bg-ink-950/40 border border-ink-100 dark:border-ink-800 p-4"
                    >
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-bold text-primary-600 dark:text-primary-300">
                          {v.word}
                        </span>
                        {v.phonetic && (
                          <span className="text-xs text-ink-400 dark:text-ink-500 font-mono">
                            {v.phonetic}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-ink-700 dark:text-ink-300 mt-1.5 leading-relaxed">
                        {v.meaning}
                      </p>
                      {v.reason && (
                        <p className="text-xs text-ink-500 dark:text-ink-400 mt-1.5 leading-relaxed">
                          {v.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 长难句拆解 ── */}
            {content.sentences.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-ink-500 dark:text-ink-400 uppercase tracking-widest mb-4">
                  长难句拆解
                </h3>
                <div className="space-y-3">
                  {content.sentences.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-ink-50 dark:bg-ink-950/40 border-l-4 border-l-primary-400 dark:border-l-primary-600 p-4"
                    >
                      <p className="text-sm font-semibold text-ink-800 dark:text-ink-200 leading-relaxed">
                        {s.text}
                      </p>
                      <p className="text-sm text-ink-500 dark:text-ink-400 mt-2.5 leading-relaxed">
                        {s.analysis}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 本集跟读句推荐 ── */}
            {content.shadowing.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-ink-500 dark:text-ink-400 uppercase tracking-widest mb-4">
                  本集跟读句推荐
                </h3>
                <div className="space-y-2.5">
                  {content.shadowing.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-ink-50 dark:bg-ink-950/40 p-4 flex items-start gap-3"
                    >
                      <Headphones
                        size={16}
                        className="text-primary-500 shrink-0 mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium text-ink-800 dark:text-ink-200 leading-relaxed">
                          {s.text}
                        </p>
                        {s.reason && (
                          <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                            {s.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 理解测验 ── */}
            {content.quiz.length > 0 && <QuizBlock quiz={content.quiz} />}

            {/* ── 底部"收起内容"控制栏 ── */}
            <div className="flex justify-end items-center mt-2 pt-4 border-t border-ink-100 dark:border-ink-800">
              <button
                type="button"
                onClick={handleCollapse}
                className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-primary-600 dark:text-ink-400 dark:hover:text-primary-400 transition-colors cursor-pointer py-2 px-3 -mr-3 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800/50"
              >
                收起内容
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  // ── 未加载：入口卡（免费锁定态 / PRO 加载态） ──
  return (
    <section className="rounded-2xl bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 shadow-sm">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="w-full text-left group p-6 md:p-8"
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
            <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">
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
              className="text-ink-400 shrink-0 group-hover:text-ink-600 dark:group-hover:text-ink-300 transition-colors"
            />
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {FEATURE_CHIPS.map((chip) => (
            <span
              key={chip.text}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink-50 dark:bg-ink-950/60 text-xs font-bold text-ink-500 dark:text-ink-400"
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
      <h3 className="text-xs font-bold text-ink-500 dark:text-ink-400 uppercase tracking-widest mb-4">
        理解测验
      </h3>
      <div className="space-y-4">
        {quiz.map((q, qi) => {
          const picked = answers[qi];
          return (
            <div
              key={qi}
              className="rounded-xl bg-ink-50 dark:bg-ink-950/40 border border-ink-100 dark:border-ink-800 p-4"
            >
              <p className="text-sm font-bold text-ink-900 dark:text-ink-100 mb-3">
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
                          ? "border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-semibold"
                          : showState && isPicked && !isCorrect
                            ? "border-error-300 dark:border-error-700 bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400"
                            : "border-ink-200 dark:border-ink-700 hover:border-primary-300 dark:hover:border-primary-700 text-ink-700 dark:text-ink-300 bg-white dark:bg-ink-900"
                      } ${showState ? "cursor-default" : "cursor-pointer"}`}
                    >
                      {showState && isCorrect ? (
                        <CheckCircle2 size={16} className="shrink-0" />
                      ) : showState && isPicked ? (
                        <XCircle size={16} className="shrink-0" />
                      ) : (
                        <span className="w-4 text-center text-xs font-bold text-ink-400 shrink-0">
                          {String.fromCharCode(65 + oi)}
                        </span>
                      )}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
              {picked !== undefined && q.explanation && (
                <p className="text-xs text-ink-600 dark:text-ink-400 mt-3 bg-white dark:bg-ink-900/50 rounded-lg px-3 py-2 leading-relaxed">
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
