"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  ChevronLeft,
  Volume2,
  Sparkles,
  ArrowRight,
  Mic,
  BookOpen,
  Repeat,
  HelpCircle,
  MousePointerClick,
  MoveLeft,
  MoveRight,
  TextQuote,
  ListOrdered,
  Layers,
  Lock,
  Flame,
  RotateCcw,
  Clock,
  CheckCircle,
  Award,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import type { SavedSentenceItem } from "@/core/sentences/dto";
import { filterLinkedVocabWords } from "@/core/sentences/linked-vocab";
import { useVocabHighlightStore } from "@/store/vocab-highlight-store";
import { useUIStore } from "@/store/ui-store";
import VocabularyHighlighter from "@/components/sentence/VocabularyHighlighter";
import { getEpisodeAudioUrl } from "@/lib/client/episode-audio";
import { useNotebookBase } from "@/lib/notebook-base";
import { calculateNextReview, isDue, ReviewQuality } from "@/lib/srs";
import { submitSentenceReview } from "@/lib/actions/sentences-actions";

interface ReviewDeckProps {
  sentences: SavedSentenceItem[];
  /** 生词本（word + 释义），复习卡正面英文生词高亮联动 */
  vocabWords: { word: string; definition: string | null }[];
  /** 深链定位：来自影子跟读评测页「返回卡片」，按 subtitleId 定位初始卡 */
  initialSubtitleId?: string;
  /** [P3-d] 会员态：基础刷句永久免费（公理 1），高级模式与翻卡成就为 PRO 专属 */
  isPremium?: boolean;
}

/** [P3-d] 刷句模式：sequential 基础免费；tag 组卷 / srs 调度为 PRO 高级模式 */
type ReviewMode = "sequential" | "tag" | "srs";

/**
 * 移动端刷句复习卡（复刻自 yuanlu-podcast pages/MobileReview.tsx）：
 * 顺序遍历、到末尾回环；点击卡片翻面（译文/笔记），左滑下一句、右滑重听原音；
 * 背景堆叠卡 + 手势角标 + 底部单手操作坞；顶部进度条。
 *
 * [P3-d] 模式选择器：基础刷句（滑动/翻面/重听/原音）永久免费；
 * 标签组卷、SRS 到期调度与连续翻卡成就为 PRO 专属增量——
 * 非会员点击置锁项弹 sentence_review_advanced 场景会员窗（埋点由 openPremiumModal 内置）。
 *
 * [SRS] 真遗忘曲线（对齐生词本口径）：
 * - 卡背四档打卡（忘记/模糊/认识/简单 + 间隔预览）三模式通用免费——
 *   打卡走 submitSentenceReview 更新 proficiency/nextReviewAt（Leitner 阶梯）
 * - srs 模式 = isDue 到期队列（nextReviewAt 升序）；会员/管理员默认进 srs，
 *   免费用户默认顺序刷（小程序侧 _autoModeByMembership 同口径，含用户手选
 *   不覆盖与深链定位跳过两个守卫）
 * - 三模式走完最后一张均进总结屏（四档统计 + 跳过数 + 再来一轮忘记子集；
 *   sequential/tag 另有「继续刷」回第 0 张承接原回环浏览）；
 *   左滑/下一句 = 跳过不评分
 */
export default function ReviewDeck({
  sentences,
  vocabWords,
  initialSubtitleId,
  isPremium = false,
}: ReviewDeckProps) {
  // 返回/跟读入口用绝对路径前缀：从 /review 分支进入回到复习中心（Top Tabs 常驻），
  // 从 /library 分支进入回到独立句子本页
  const base = useNotebookBase("sentences");
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!initialSubtitleId) return 0;
    const idx = sentences.findIndex(
      (s) => String(s.subtitleId) === initialSubtitleId,
    );
    return idx >= 0 ? idx : 0;
  });
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // ── [P3-d] 模式选择器：顺序刷（免费）/ 标签组卷 / SRS 调度（PRO）──
  // 会员/管理员默认 srs 到期队列（isPremium 含 ADMIN 直通）；免费用户默认顺序刷
  const [mode, setMode] = useState<ReviewMode>(
    isPremium ? "srs" : "sequential",
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  // 连续翻卡成就计数（PRO 解锁成就提示；免费仅展示锁定徽章）
  const [flipCount, setFlipCount] = useState(0);

  // ── [SRS] 打卡会话状态 ──
  // 本地副本：SSR 初值，打卡后按服务端返回乐观覆写 proficiency/nextReviewAt
  const [items, setItems] = useState<SavedSentenceItem[]>(sentences);
  useEffect(() => setItems(sentences), [sentences]);
  // 本轮打卡记录（总结页四档统计 + 忘记子集「再来一轮」共用）
  const [roundRatings, setRoundRatings] = useState<
    { id: number; quality: ReviewQuality }[]
  >([]);
  // srs 模式走完队列 → 总结屏（sequential/tag 保持回环不变）
  const [sessionDone, setSessionDone] = useState(false);
  // 再来一轮的忘记子集（null = 首轮全量）
  const [retryIds, setRetryIds] = useState<Set<number> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 卡组快照版本：打卡会让 nextReviewAt 前移，若卡组随 items 实时重算，
  // 刚打完的卡会被挤出 due 队列导致索引错位——进模式/换标签/再来一轮时定格
  const [deckVersion, setDeckVersion] = useState(0);
  const rebuildDeck = () => setDeckVersion((v) => v + 1);

  const openAdvancedModal = () =>
    useUIStore.getState().openPremiumModal("sentence_review_advanced");

  const switchMode = (next: ReviewMode) => {
    if (next !== "sequential" && !isPremium) {
      openAdvancedModal();
      return;
    }
    setMode(next);
    if (next !== "tag") setSelectedTag(null);
    // 换模式 = 新会话：清打卡记录/总结态/忘记子集，重定格卡组
    setSessionDone(false);
    setRoundRatings([]);
    setRetryIds(null);
    rebuildDeck();
  };

  // 标签组卷候选：句库中实际出现的标签（附计数）
  const tagOptions = useMemo(() => {
    const map = new Map<string, number>();
    sentences.forEach((s) =>
      (s.tags || []).forEach((t) => map.set(t, (map.get(t) ?? 0) + 1)),
    );
    return Array.from(map, ([tag, count]) => ({ tag, count })).sort(
      (a, b) => b.count - a.count,
    );
  }, [sentences]);

  // 最新数据镜像：卡组快照从这里读（打卡更新 items 时不触发卡组重算）
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // 当前模式的卡组（快照语义：仅 mode/tag/retry/version 变更时重算，打卡不扰动索引）：
  // - sequential：收藏序（最新在前，service 默认口径）
  // - tag：选中标签的子集组卷
  // - srs：[SRS] 到期队列 = isDue 过滤 + nextReviewAt 升序（最早到期先复习；
  //   曾以收藏时间为代理排序，现接真遗忘曲线调度）
  const deck = useMemo(() => {
    const source = retryIds
      ? itemsRef.current.filter((s) => retryIds.has(s.id))
      : itemsRef.current;
    if (mode === "tag" && selectedTag)
      return source.filter((s) => (s.tags || []).includes(selectedTag));
    if (mode === "srs")
      return source
        .filter((s) => isDue(s.nextReviewAt))
        .sort((a, b) =>
          String(a.nextReviewAt || "").localeCompare(
            String(b.nextReviewAt || ""),
          ),
        );
    return source;
  }, [mode, selectedTag, retryIds, deckVersion]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // 操作说明 DaisyUI 弹窗（原生 dialog，showModal 驱动）
  const helpModalRef = useRef<HTMLDialogElement>(null);

  // 切换模式/标签后越界复位 + 会话重置（标签 pills 直改 selectedTag 的路径）
  useEffect(() => {
    setCurrentIndex(0);
    setSessionDone(false);
    setRoundRatings([]);
    setRetryIds(null);
    rebuildDeck();
  }, [mode, selectedTag]);

  const currentSentence = deck[currentIndex] || null;

  // 真实联动词汇：只喂实际出现在复习句中的生词（与句子本同一口径）
  const linkedVocabWords = useMemo(
    () => filterLinkedVocabWords(vocabWords, sentences),
    [vocabWords, sentences],
  );

  // 生词高亮全局镜像（VocabularyHighlighter 读取）
  const setVocabWords = useVocabHighlightStore((s) => s.setWords);
  useEffect(() => {
    setVocabWords(linkedVocabWords);
  }, [linkedVocabWords, setVocabWords]);

  // Motion values for swipe gesture
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacityLeft = useTransform(x, [-150, -40], [1, 0]); // Next
  const opacityRight = useTransform(x, [40, 150], [0, 1]); // Replay

  // Clean up audio on unmount or sentence change
  useEffect(() => {
    setIsFlipped(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlayingAudio(false);
    }
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const playSentenceAudio = async () => {
    if (!currentSentence) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }

    try {
      const audioUrl = await getEpisodeAudioUrl(currentSentence.episodeid);
      if (!audioUrl) {
        toast.error("暂时无法播放原声");
        return;
      }

      const audio = new Audio();
      audio.setAttribute("src", audioUrl);
      audioRef.current = audio;
      audio.currentTime = currentSentence.startTime;
      setIsPlayingAudio(true);

      audio.addEventListener("timeupdate", () => {
        if (audio.currentTime >= currentSentence.endTime) {
          audio.pause();
          setIsPlayingAudio(false);
        }
      });

      audio.addEventListener("ended", () => {
        setIsPlayingAudio(false);
      });

      audio.play().catch(() => {
        console.warn("Autoplay audio blocked");
        setIsPlayingAudio(false);
      });
    } catch {
      toast.error("原声信息加载失败");
      setIsPlayingAudio(false);
    }
  };

  const handleNext = () => {
    // 任意模式走完最后一张 → 总结屏（回环浏览改由总结屏「继续刷」显式承接）
    if (currentIndex >= deck.length - 1) {
      setSessionDone(true);
      bumpFlipAchievement();
      return;
    }
    setCurrentIndex((prev) => (deck.length ? (prev + 1) % deck.length : 0));
    bumpFlipAchievement();
  };

  // [P3-d] 连续翻卡成就：每翻 10 张达成一级（PRO 专属提示）
  const bumpFlipAchievement = () => {
    setFlipCount((prev) => {
      const next = prev + 1;
      if (isPremium && next % 10 === 0) {
        toast.success(`🔥 连续翻卡 ${next} 张，复习节奏稳住了！`);
      }
      return next;
    });
  };

  // ── [SRS] 四档打卡：乐观更新 → 服务端权威覆写 → 前进/收尾 ──
  const advanceAfterRating = () => {
    // 打完最后一张即一轮完成 → 总结屏（三模式同口径，不回环）
    if (currentIndex >= deck.length - 1) {
      setSessionDone(true);
      bumpFlipAchievement();
      return;
    }
    setCurrentIndex((prev) => (deck.length ? (prev + 1) % deck.length : 0));
    bumpFlipAchievement();
  };

  const handleQualitySelect = async (quality: ReviewQuality) => {
    if (!currentSentence || isSubmitting) return;
    setIsSubmitting(true);
    const prevProficiency = currentSentence.proficiency ?? 0;
    const optimistic = calculateNextReview(prevProficiency, quality);

    // 乐观更新本地副本（卡背间隔预览即时反映下一轮）
    setItems((prev) =>
      prev.map((s) =>
        s.id === currentSentence.id
          ? {
              ...s,
              proficiency: optimistic.proficiency,
              nextReviewAt: optimistic.nextReviewAt.toISOString(),
            }
          : s,
      ),
    );

    try {
      const res = await submitSentenceReview({
        id: currentSentence.id,
        quality,
      });
      if (!res.success || !res.data) {
        throw new Error(res.message || "打卡失败");
      }
      // 服务端权威值覆写（Leitner 口径与乐观值一致，以返回为准）
      const authoritative = res.data;
      setItems((prev) =>
        prev.map((s) =>
          s.id === authoritative.id
            ? {
                ...s,
                proficiency: authoritative.proficiency,
                nextReviewAt: authoritative.nextReviewAt,
              }
            : s,
        ),
      );
      setRoundRatings((prev) => [...prev, { id: currentSentence.id, quality }]);
      setIsFlipped(false);
      advanceAfterRating();
    } catch (error) {
      // 失败回滚乐观更新，留在当前卡重试
      setItems((prev) =>
        prev.map((s) =>
          s.id === currentSentence.id
            ? {
                ...s,
                proficiency: prevProficiency,
                nextReviewAt: currentSentence.nextReviewAt,
              }
            : s,
        ),
      );
      toast.error(error instanceof Error ? error.message : "打卡失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  // [SRS] 四档间隔预览（ReviewModal.getIntervalLabel 同口径）
  const intervalPreviews = useMemo(() => {
    const p = currentSentence?.proficiency ?? 0;
    const label = (q: ReviewQuality) => {
      const { nextReviewAt } = calculateNextReview(p, q);
      const days = Math.round(
        (nextReviewAt.getTime() - Date.now()) / (1000 * 3600 * 24),
      );
      if (days <= 0) return "今天";
      if (days === 1) return "1天";
      return `${days}天`;
    };
    return {
      forgot: label(ReviewQuality.FORGOT),
      hard: label(ReviewQuality.HARD),
      good: label(ReviewQuality.GOOD),
      easy: label(ReviewQuality.EASY),
    };
  }, [currentSentence]);

  const srsButtons = [
    {
      quality: ReviewQuality.FORGOT,
      icon: RotateCcw,
      label: "忘记",
      interval: intervalPreviews.forgot,
      hover:
        "hover:text-error-500 dark:hover:text-error-400 hover:ring-error-500/30 dark:hover:ring-error-400/30",
    },
    {
      quality: ReviewQuality.HARD,
      icon: Clock,
      label: "模糊",
      interval: intervalPreviews.hard,
      hover: "hover:text-warning hover:ring-warning/30",
    },
    {
      quality: ReviewQuality.GOOD,
      icon: CheckCircle,
      label: "认识",
      interval: intervalPreviews.good,
      hover: "hover:text-success hover:ring-success/30",
    },
    {
      quality: ReviewQuality.EASY,
      icon: Award,
      label: "简单",
      interval: intervalPreviews.easy,
      hover:
        "hover:text-info-500 dark:hover:text-info-400 hover:ring-info-500/30 dark:hover:ring-info-400/30",
    },
  ];

  // 本轮忘记子集（再来一轮重测对象）
  const forgottenIds = roundRatings
    .filter((r) => r.quality === ReviewQuality.FORGOT)
    .map((r) => r.id);

  const summaryStats = {
    forgot: roundRatings.filter((r) => r.quality === ReviewQuality.FORGOT)
      .length,
    hard: roundRatings.filter((r) => r.quality === ReviewQuality.HARD).length,
    good: roundRatings.filter((r) => r.quality === ReviewQuality.GOOD).length,
    easy: roundRatings.filter((r) => r.quality === ReviewQuality.EASY).length,
  };

  // [SRS] 再来一轮：只重测忘记子集（防死循环承接，vocab retryForgotten 同款）
  const startRetry = () => {
    // 无禁用态（按钮恒为主按钮样式）：忘记数为 0 时以 toast 反馈替代置灰
    if (forgottenIds.length === 0) {
      toast("本轮没有忘记的句子，无需再来一轮");
      return;
    }
    setRetryIds(new Set(forgottenIds));
    setRoundRatings([]);
    setSessionDone(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    rebuildDeck();
  };

  // 继续刷：回环浏览的显式承接（sequential/tag 总结屏入口；回第 0 张开新一轮。
  // srs 不提供——到期队列已清空，继续走「今日已完成」语义）
  const continueBrowsing = () => {
    setRoundRatings([]);
    setSessionDone(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    rebuildDeck();
  };

  const handleDragEnd = (
    _event: unknown,
    info: { offset: { x: number }; velocity: { x: number } },
  ) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Swipe Left (threshold -100 or high velocity) -> Next Card
    if (offset < -90 || velocity < -400) {
      handleNext();
    }
    // Swipe Right (threshold +90 or high velocity) -> Replay Audio
    else if (offset > 90 || velocity > 400) {
      playSentenceAudio();
    }
  };

  const toggleFlip = () => {
    // Only flip if not dragging significantly
    if (Math.abs(x.get()) < 10) {
      setIsFlipped(!isFlipped);
    }
  };

  if (sentences.length === 0) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center text-primary-600 dark:text-primary-400">
          <TextQuote size={30} />
        </div>
        <h2 className="text-xl font-bold">句子本为空</h2>
        <p className="text-sm text-base-content/60 max-w-xs">
          请先在播客单集逐字稿中收藏一些句子，再进入卡片复习模式。
        </p>
        <Link
          href={base}
          className="btn rounded-xl px-6 border-none bg-primary-600 hover:bg-primary-500 text-white"
        >
          返回句子本
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[90vh] flex flex-col justify-between max-w-md mx-auto px-4 py-3 select-none">
      {/* Top App Bar */}
      <div className="flex items-center justify-between py-2">
        {/* 返回句子本（上下文感知的绝对路径前缀） */}
        <Link
          href={base}
          className="btn btn-ghost btn-circle btn-sm text-base-content/70"
          title="退出复习模式"
        >
          <ChevronLeft size={22} />
        </Link>

        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-base-content/50 uppercase tracking-wider">
            刷句复习
          </span>
          <span className="text-sm font-black text-base-content">
            {currentIndex + 1}{" "}
            <span className="text-base-content/40">/ {deck.length}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => helpModalRef.current?.showModal()}
          className="btn btn-ghost btn-circle btn-sm text-base-content/50"
          title="操作说明"
        >
          <HelpCircle size={18} />
        </button>
      </div>

      {/* [P3-d] 模式选择器：基础刷句永久免费；标签组卷 / SRS 调度为 PRO 置锁 */}
      <div className="flex items-center justify-between gap-2 py-1.5">
        <div className="flex items-center gap-1.5 bg-base-200/70 dark:bg-ink-800/60 p-1 rounded-2xl">
          {(
            [
              {
                key: "sequential",
                label: "顺序刷",
                icon: ListOrdered,
                pro: false,
              },
              { key: "tag", label: "标签组卷", icon: Layers, pro: true },
              { key: "srs", label: "SRS 调度", icon: Sparkles, pro: true },
            ] as {
              key: ReviewMode;
              label: string;
              icon: typeof Layers;
              pro: boolean;
            }[]
          ).map((m) => {
            const active = mode === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => switchMode(m.key)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                  active
                    ? "bg-base-100 dark:bg-ink-900 text-primary-600 dark:text-primary-400 shadow-sm"
                    : "text-base-content/50 hover:text-base-content/80"
                }`}
                title={
                  m.pro && !isPremium
                    ? "PRO 专属模式，点击升级解锁"
                    : m.key === "tag"
                      ? "按标签筛选组卷集中刷"
                      : m.key === "srs"
                        ? "按遗忘曲线到期优先，智能调度复习顺序"
                        : "按收藏顺序复习（翻面四档打卡免费推进遗忘曲线）"
                }
              >
                <m.icon size={13} />
                <span>{m.label}</span>
                {m.pro && !isPremium && (
                  <Lock size={10} className="opacity-60" />
                )}
                {m.pro && isPremium && (
                  <span className="text-[9px] text-amber-500 font-black">
                    PRO
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 连续翻卡成就：PRO 实时计数，免费锁定引导 */}
        <button
          type="button"
          onClick={() => {
            if (!isPremium) {
              openAdvancedModal();
              return;
            }
            toast(`本会话已连翻 ${flipCount} 张`, {
              description: "每 10 张达成一级成就，坚持就是复利 🔥",
            });
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-2xl text-[11px] font-bold shrink-0 transition-colors ${
            isPremium
              ? "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
              : "bg-base-200/70 dark:bg-ink-800/60 text-base-content/50"
          }`}
          title={isPremium ? "连续翻卡成就" : "翻卡成就是 PRO 专属，点击解锁"}
        >
          {isPremium ? <Flame size={13} /> : <Lock size={11} />}
          {isPremium ? flipCount : "成就"}
        </button>
      </div>

      {/* 标签组卷模式：标签 pills（会员可用；无标签句时引导回句子本打标签） */}
      {mode === "tag" && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {tagOptions.length === 0 ? (
            <span className="text-[11px] text-base-content/50 py-1">
              句库还没有标签——先在句子本为句子添加标签，再来组卷刷句
            </span>
          ) : (
            tagOptions.map(({ tag, count }) => {
              const active = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(active ? null : tag)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                    active
                      ? "bg-primary-600 text-white shadow-sm"
                      : "bg-base-200/80 dark:bg-ink-800 text-base-content/60 hover:bg-base-200"
                  }`}
                >
                  {tag} <span className="opacity-60 text-[9px]">({count})</span>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Progress Line */}
      <div className="w-full bg-base-200 h-1.5 rounded-full overflow-hidden my-2">
        <div
          className="bg-primary-600 dark:bg-primary-400 h-full rounded-full transition-all duration-300"
          style={{
            width: `${deck.length > 0 ? ((currentIndex + 1) / deck.length) * 100 : 0}%`,
          }}
        />
      </div>

      {/* Center Interactive Tinder-like Flashcard Area */}
      <div className="relative flex-1 flex items-center justify-center my-4 min-h-[420px]">
        {/* Background stack visual layer for depth */}
        <div className="absolute w-[92%] h-[380px] bg-base-200 rounded-3xl -bottom-2 scale-95 opacity-50 shadow-xs pointer-events-none" />
        <div className="absolute w-[96%] h-[390px] bg-base-200/80 rounded-3xl -bottom-1 scale-98 opacity-75 shadow-xs pointer-events-none" />

        {/* [SRS] 总结屏：任意模式走完一轮（忘记子集重测完毕同样回到这里） */}
        {sessionDone ? (
          <div className="w-full flex flex-col items-center justify-center text-center space-y-4 py-6 z-10">
            <div className="bg-success/10 p-4 rounded-full">
              <Trophy size={44} className="text-success" />
            </div>
            <h2 className="text-xl font-bold text-base-content">
              {retryIds ? "忘记的句子重测完毕" : "本轮刷句复习完成"}
            </h2>
            <p className="text-sm text-base-content/60 max-w-xs">
              {retryIds
                ? "忘记的句子已重测完毕。"
                : mode === "srs"
                  ? "到期队列已清空，下次复习时间已按遗忘曲线排期。"
                  : `已刷完一轮 ${deck.length} 张，翻面打卡的句子已按遗忘曲线排期。`}
            </p>
            <div className="grid grid-cols-4 gap-2 w-full max-w-sm">
              {(
                [
                  {
                    label: "忘记",
                    count: summaryStats.forgot,
                    cls: "bg-error/10 text-error",
                  },
                  {
                    label: "模糊",
                    count: summaryStats.hard,
                    cls: "bg-warning/10 text-warning",
                  },
                  {
                    label: "认识",
                    count: summaryStats.good,
                    cls: "bg-success/10 text-success",
                  },
                  {
                    label: "简单",
                    count: summaryStats.easy,
                    cls: "bg-info-500/10 text-info-600 dark:text-info-400",
                  },
                ] as const
              ).map((t) => (
                <div key={t.label} className={`rounded-xl py-2.5 ${t.cls}`}>
                  <div className="text-lg font-black">{t.count}</div>
                  <div className="text-[10px] font-bold">{t.label}</div>
                </div>
              ))}
            </div>
            {deck.length - roundRatings.length > 0 && (
              <p className="text-[11px] text-base-content/40">
                另有 {deck.length - roundRatings.length} 张跳过未评分，保持到期
              </p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={startRetry}
                className="btn rounded-xl px-5 border-none bg-primary-600 hover:bg-primary-500 dark:bg-primary-500 dark:hover:bg-primary-400 text-white font-bold"
                title="只重测本轮标记为忘记的句子"
              >
                <RotateCcw size={16} />
                再来一轮（{forgottenIds.length}）
              </button>
              {mode !== "srs" && (
                <button
                  type="button"
                  onClick={continueBrowsing}
                  className="btn rounded-xl px-5 btn-outline border-base-300 text-base-content font-bold"
                  title="回到第一张继续浏览（原回环行为）"
                >
                  继续刷
                </button>
              )}
              <Link
                href={base}
                className="btn rounded-xl px-5 btn-outline border-base-300 text-base-content font-bold"
              >
                返回句子本
              </Link>
            </div>
          </div>
        ) : mode === "srs" && deck.length === 0 ? (
          /* [SRS] 到期队列为空：今日已完成（非空句子本的兜底态） */
          <div className="w-full flex flex-col items-center justify-center text-center space-y-4 py-10 z-10">
            <div className="bg-success/10 p-4 rounded-full">
              <CheckCircle size={40} className="text-success" />
            </div>
            <h2 className="text-lg font-bold text-base-content">
              今日句子复习已完成
            </h2>
            <p className="text-sm text-base-content/60 max-w-xs">
              没有到期的句子。去播客里收藏新句子，或切回顺序刷自由浏览。
            </p>
            <Link
              href={base}
              className="btn rounded-xl px-6 border-none bg-primary-600 hover:bg-primary-500 text-white"
            >
              返回句子本
            </Link>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSentence.id}
              style={{ x, rotate }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={handleDragEnd}
              whileTap={{ cursor: "grabbing" }}
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, transition: { duration: 0.15 } }}
              onClick={toggleFlip}
              className="relative w-full h-[410px] bg-base-100 rounded-3xl p-6 sm:p-7 shadow-xl border border-base-200 cursor-grab active:cursor-grabbing flex flex-col justify-between isolate overflow-hidden"
            >
              {/* Gesture Cue Overlays */}
              {/* Right Swipe indicator: Replay Native Audio */}
              <motion.div
                style={{ opacity: opacityRight }}
                className="absolute left-6 top-6 z-30 bg-emerald-500 text-white font-black px-3.5 py-1.5 rounded-2xl shadow-lg flex items-center gap-1.5 text-xs uppercase tracking-wider -rotate-12 border-2 border-white pointer-events-none"
              >
                <Volume2 size={16} /> 重听原音
              </motion.div>

              {/* Left Swipe indicator: Next Sentence */}
              <motion.div
                style={{ opacity: opacityLeft }}
                className="absolute right-6 top-6 z-30 bg-primary-600 text-white font-black px-3.5 py-1.5 rounded-2xl shadow-lg flex items-center gap-1.5 text-xs uppercase tracking-wider rotate-12 border-2 border-white pointer-events-none"
              >
                下一句 <ArrowRight size={16} />
              </motion.div>

              {/* Card Content: Front (English + Highlight) vs Back (Chinese + Notes) */}
              <div className="flex-1 flex flex-col justify-center">
                {!isFlipped ? (
                  /* FRONT SIDE: English Sentence */
                  <div className="space-y-4 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400 text-[11px] font-bold mx-auto">
                      <Sparkles size={12} />
                      <span>原句精听与复习</span>
                    </div>

                    <div className="text-xl sm:text-2xl font-serif font-bold text-ink-900 dark:text-ink-100 leading-relaxed px-2">
                      <VocabularyHighlighter
                        text={currentSentence.enText}
                        highlightClassName="bg-accent-50 text-ink-900 dark:bg-accent-950/40 dark:text-accent-300 font-bold px-1 py-0.5 rounded border-b-2 border-accent-400 dark:border-accent-500 inline-block transition-all"
                      />
                    </div>

                    <div className="text-xs text-ink-400 dark:text-ink-500 font-medium">
                      轻触卡片空白处翻转查看译文与笔记
                    </div>
                  </div>
                ) : (
                  /* BACK SIDE: Chinese Translation & Notes */
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200 text-left">
                    <div className="flex items-center justify-between border-b border-base-200 pb-2">
                      <span className="text-xs font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1">
                        <BookOpen size={13} /> 中文翻译参考
                      </span>
                      <span className="text-[10px] text-ink-400 dark:text-ink-500">
                        已翻转
                      </span>
                    </div>

                    <p className="text-base font-medium text-ink-500 dark:text-ink-300 leading-relaxed">
                      {currentSentence.zhText || "暂无翻译"}
                    </p>

                    {/* Personal Note */}
                    {currentSentence.note && (
                      <div className="p-3 bg-base-200/60 rounded-2xl border border-base-300/40 text-xs text-ink-600 dark:text-ink-300 leading-relaxed font-sans">
                        <strong className="text-primary-600 dark:text-primary-400 block mb-1">
                          学习笔记：
                        </strong>
                        {currentSentence.note}
                      </div>
                    )}

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {currentSentence.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-base-200 text-ink-500 dark:text-ink-400 text-[10px] font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* [SRS] 四档打卡（三模式通用免费；小字=下次复习间隔预览，
                      ReviewModal srsButtons 同款口径） */}
                    <div className="grid grid-cols-4 gap-1.5 pt-2 mt-1 border-t border-base-200/70">
                      {srsButtons.map((btn) => (
                        <button
                          key={btn.label}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleQualitySelect(btn.quality)}
                          className={`flex flex-col items-center py-2 px-1 rounded-xl bg-white dark:bg-ink-800 text-base-content/70 ring-1 ring-base-200 dark:ring-base-content/10 transition-all group disabled:opacity-50 ${btn.hover}`}
                          title="打卡后按遗忘曲线排下次复习"
                        >
                          <btn.icon
                            size={16}
                            className="mb-0.5 group-hover:scale-110 transition-transform"
                          />
                          <span className="text-[10px] font-bold">
                            {btn.label}
                          </span>
                          <span className="text-[9px] opacity-60">
                            {btn.interval}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Bottom Meta Footer */}
              <div className="pt-4 border-t border-base-200 flex items-center justify-between text-xs text-ink-400 dark:text-ink-500">
                <span className="truncate max-w-[180px] font-medium text-[11px]">
                  {currentSentence.episodeTitle || "播客单集原声"}
                </span>
                <span className="font-mono text-[10px] bg-base-200 px-2 py-0.5 rounded">
                  {currentSentence.startTime}s - {currentSentence.endTime}s
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Bottom One-Handed Mobile Control Dock（总结/今日完成态无当前卡，隐藏） */}
      {!sessionDone &&
        currentSentence &&
        !(mode === "srs" && deck.length === 0) && (
          <div className="bg-base-100 rounded-3xl p-3 shadow-lg border border-base-200 flex items-center justify-around gap-2">
            {/* Replay button */}
            <button
              type="button"
              onClick={playSentenceAudio}
              className={`btn btn-circle rounded-full transition-transform active:scale-90 border-none ${
                isPlayingAudio
                  ? "btn-success text-white shadow-md animate-pulse"
                  : "btn-ghost text-base-content hover:bg-base-200"
              }`}
              title="右滑或点击：重听原音"
            >
              <Volume2 size={22} />
            </button>

            {/* Flip Card toggle button */}
            <button
              type="button"
              onClick={() => setIsFlipped(!isFlipped)}
              className={`btn rounded-2xl h-12 px-5 font-bold text-xs flex items-center gap-1.5 transition-all border-none ${
                isFlipped
                  ? "btn-neutral"
                  : "btn-outline border-base-300 text-base-content"
              }`}
              title="点击翻转卡片"
            >
              <Repeat size={16} />
              <span>{isFlipped ? "看英文" : "看译文"}</span>
            </button>

            {/* AI Shadowing Evaluation entry：路由到独立的影子跟读评测页（对齐发音弱项本闯关入口） */}
            {currentSentence.subtitleId != null && (
              <Link
                href={`${base}/review/practice?subtitleId=${currentSentence.subtitleId}`}
                className="btn btn-outline border-primary-500/30 text-primary-600 dark:text-primary-400 dark:border-primary-400/30 hover:bg-primary-600 hover:text-white hover:border-primary-600 dark:hover:bg-primary-500 dark:hover:text-white dark:hover:border-primary-500 rounded-2xl h-12 px-4 font-bold text-xs flex items-center gap-1.5"
                title="AI 影子跟读评测"
              >
                <Mic size={16} />
                <span>跟读</span>
              </Link>
            )}

            {/* Next Card button */}
            <button
              type="button"
              onClick={handleNext}
              className="btn btn-circle rounded-full shadow-md shadow-primary-600/20 dark:shadow-primary-400/20 transition-transform active:scale-90 border-none bg-primary-600 hover:bg-primary-500 dark:bg-primary-500 dark:hover:bg-primary-400 text-white"
              title="左滑或点击：下一句"
            >
              <ArrowRight size={22} />
            </button>
          </div>
        )}

      {/* 操作说明弹窗（DaisyUI modal：原生 dialog + method="dialog" 关闭） */}
      <dialog ref={helpModalRef} className="modal">
        <div className="modal-box max-w-sm">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <HelpCircle
              size={18}
              className="text-primary-600 dark:text-primary-400"
            />
            手势操作指南
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-base-content/80">
            <li className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                <MousePointerClick size={16} />
              </span>
              <span>
                <strong className="font-bold text-base-content">
                  点击卡片空白处
                </strong>
                ：翻转卡片查看译文与笔记
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                <MoveLeft size={16} />
              </span>
              <span>
                <strong className="font-bold text-base-content">
                  左滑卡片
                </strong>
                ：切换到下一句
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                <MoveRight size={16} />
              </span>
              <span>
                <strong className="font-bold text-base-content">
                  右滑卡片
                </strong>
                ：重听原声音频
              </span>
            </li>
          </ul>
          <div className="modal-action">
            <form method="dialog" className="w-full">
              <button className="btn btn-sm w-full bg-primary-600 hover:bg-primary-500 text-white border-none rounded-xl">
                知道了
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}
