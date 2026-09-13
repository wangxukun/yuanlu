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
} from "lucide-react";
import { toast } from "sonner";
import type { SavedSentenceItem } from "@/core/sentences/dto";
import { filterLinkedVocabWords } from "@/core/sentences/linked-vocab";
import { useVocabHighlightStore } from "@/store/vocab-highlight-store";
import VocabularyHighlighter from "@/components/sentence/VocabularyHighlighter";
import { getEpisodeAudioUrl } from "@/lib/client/episode-audio";

interface ReviewDeckProps {
  sentences: SavedSentenceItem[];
  /** 生词本（word + 释义），复习卡正面英文生词高亮联动 */
  vocabWords: { word: string; definition: string | null }[];
  /** 深链定位：来自影子跟读评测页「返回卡片」，按 subtitleId 定位初始卡 */
  initialSubtitleId?: string;
}

/**
 * 移动端刷句复习卡（复刻自 yuanlu-podcast pages/MobileReview.tsx）：
 * 顺序遍历、到末尾回环；点击卡片翻面（译文/笔记），左滑下一句、右滑重听原音；
 * 背景堆叠卡 + 手势角标 + 底部单手操作坞；顶部进度条。
 */
export default function ReviewDeck({
  sentences,
  vocabWords,
  initialSubtitleId,
}: ReviewDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!initialSubtitleId) return 0;
    const idx = sentences.findIndex(
      (s) => String(s.subtitleId) === initialSubtitleId,
    );
    return idx >= 0 ? idx : 0;
  });
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // 操作说明 DaisyUI 弹窗（原生 dialog，showModal 驱动）
  const helpModalRef = useRef<HTMLDialogElement>(null);

  const currentSentence = sentences[currentIndex] || null;

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
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0); // Loop back
    }
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
          href="/library/sentences"
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
        <Link
          href="/library/sentences"
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
            <span className="text-base-content/40">/ {sentences.length}</span>
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

      {/* Progress Line */}
      <div className="w-full bg-base-200 h-1.5 rounded-full overflow-hidden my-2">
        <div
          className="bg-primary-600 dark:bg-primary-400 h-full rounded-full transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / sentences.length) * 100}%`,
          }}
        />
      </div>

      {/* Center Interactive Tinder-like Flashcard Area */}
      <div className="relative flex-1 flex items-center justify-center my-4 min-h-[420px]">
        {/* Background stack visual layer for depth */}
        <div className="absolute w-[92%] h-[380px] bg-base-200 rounded-3xl -bottom-2 scale-95 opacity-50 shadow-xs pointer-events-none" />
        <div className="absolute w-[96%] h-[390px] bg-base-200/80 rounded-3xl -bottom-1 scale-98 opacity-75 shadow-xs pointer-events-none" />

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
      </div>

      {/* Bottom One-Handed Mobile Control Dock */}
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
            href={`/library/sentences/review/practice?subtitleId=${currentSentence.subtitleId}`}
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
                <strong className="font-bold text-base-content">左滑卡片</strong>
                ：切换到下一句
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                <MoveRight size={16} />
              </span>
              <span>
                <strong className="font-bold text-base-content">右滑卡片</strong>
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
