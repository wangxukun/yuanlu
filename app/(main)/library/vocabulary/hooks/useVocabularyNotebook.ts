import { useState, useMemo, useRef, useCallback } from "react";
import { toast } from "sonner";
import { handleDictionaryQuotaBlock } from "@/lib/client/dictionary-quota";
import {
  submitReviewAction,
  updateVocabularyStatusAction,
} from "@/lib/actions/vocabulary-actions";
import { VocabularyItem } from "../VocabularyNotebook";

export const isDue = (dateStr?: string | null) => {
  if (!dateStr) return true;
  return new Date(dateStr) <= new Date();
};

export const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
};

export function useVocabularyNotebook(initialList: VocabularyItem[]) {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>(initialList);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMethod, setSortMethod] = useState<"review" | "added" | "alpha">(
    "review",
  );
  const [filterStatus, setFilterStatus] = useState<"LEARNING" | "MASTERED">(
    "LEARNING",
  );
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<VocabularyItem[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playingText, setPlayingText] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stats = useMemo(
    () => ({
      total: vocabulary.length,
      due: vocabulary.filter(
        (v) => isDue(v.nextReviewAt) && v.status !== "MASTERED",
      ).length,
      mastered: vocabulary.filter((v) => v.status === "MASTERED").length,
    }),
    [vocabulary],
  );

  const filteredList = useMemo(() => {
    const list = vocabulary.filter(
      (v) =>
        (v.status || "LEARNING") === filterStatus &&
        (v.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.translation?.includes(searchQuery)),
    );

    switch (sortMethod) {
      case "review":
        list.sort(
          (a, b) =>
            new Date(a.nextReviewAt || 0).getTime() -
            new Date(b.nextReviewAt || 0).getTime(),
        );
        break;
      case "added":
        list.sort(
          (a, b) =>
            new Date(b.addedDate || 0).getTime() -
            new Date(a.addedDate || 0).getTime(),
        );
        break;
      case "alpha":
        list.sort((a, b) => a.word.localeCompare(b.word));
        break;
    }
    return list;
  }, [vocabulary, searchQuery, sortMethod, filterStatus]);

  const stopAllAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingText(null);
  }, []);

  /** 用有道 TTS 合成并播放发音（任意文本可读）；成功返回 true。词典发音失败时的兜底。 */
  const speakViaTts = useCallback(async (text: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/dictionary/youdao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: text }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        // 配额拦截有自己的提示+会员弹窗，视为已处理
        if (handleDictionaryQuotaBlock(errBody)) return true;
        return false;
      }
      const data = await res.json();
      if (!data.speakUrl) return false;
      const audio = new Audio(data.speakUrl);
      audioRef.current = audio;
      audio.onended = () => setPlayingText(null);
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }, []);

  const playAudio = useCallback(
    (
      e: React.MouseEvent | null,
      url?: string | null,
      fallbackText?: string | null,
    ) => {
      e?.stopPropagation();
      if (!url) {
        // 无词典发音地址（如 dictvoice 未收录该词）：直接走 TTS 合成
        if (fallbackText) {
          void speakViaTts(fallbackText).then((ok) => {
            if (!ok) toast.error("暂无发音");
          });
          return;
        }
        toast.error("暂无发音");
        return;
      }
      stopAllAudio();
      try {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setPlayingText(null);
        audio.onerror = (err) => {
          // 词典发音加载失败（dictvoice 对部分复合词/生僻词返回 500）：
          // 自动降级为 TTS 合成发音，避免直接报错
          console.warn("Dict audio unavailable, falling back to TTS:", err);
          if (fallbackText) {
            void speakViaTts(fallbackText).then((ok) => {
              if (!ok) toast.error("播放失败");
            });
          } else {
            toast.error("播放失败");
          }
          setPlayingText(null);
        };
        // play() 在媒体加载失败时会以 NotSupportedError reject，
        // 与 onerror 是同一失败的重复信号；失败 UX 已由上方 onerror（含 TTS 兜底）
        // 处理，这里必须吞掉 reject，避免未处理的 Promise 拒绝触发开发面板报错
        audio.play().catch(() => {});
      } catch (error) {
        console.error("Audio initialization error:", error);
        toast.error("音频初始化失败");
      }
    },
    [stopAllAudio, speakViaTts],
  );

  const playContextAudio = useCallback(
    async (e: React.MouseEvent, text?: string | null) => {
      e.stopPropagation();
      if (!text) return;

      if (playingText === text) {
        stopAllAudio();
        return;
      }

      stopAllAudio();
      setPlayingText(text);

      try {
        const res = await fetch("/api/dictionary/youdao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word: text }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          if (handleDictionaryQuotaBlock(errBody)) {
            setPlayingText(null);
            return;
          }
          throw new Error("获取朗读地址失败");
        }

        const data = await res.json();
        if (data.speakUrl) {
          const audio = new Audio(data.speakUrl);
          audioRef.current = audio;
          audio.onended = () => setPlayingText(null);
          audio.onerror = () => {
            toast.error("播放失败");
            setPlayingText(null);
          };
          await audio.play();
        } else {
          toast.error("暂无朗读资源");
          setPlayingText(null);
        }
      } catch (error) {
        console.error("TTS Error:", error);
        toast.error("朗读服务暂时不可用");
        setPlayingText(null);
      }
    },
    [playingText, stopAllAudio],
  );

  const startReview = useCallback(() => {
    const dueWords = vocabulary.filter(
      (v) => isDue(v.nextReviewAt) && v.status !== "MASTERED",
    );
    if (dueWords.length === 0) return;
    setReviewQueue(dueWords);
    setCurrentReviewIndex(0);
    setIsCardFlipped(false);
    setIsReviewOpen(true);
  }, [vocabulary]);

  const handleSRS = useCallback(
    async (quality: number, onComplete?: () => void) => {
      if (isSubmitting) return;
      const currentWord = reviewQueue[currentReviewIndex];
      if (!currentWord) return;

      setIsSubmitting(true);
      const res = await submitReviewAction(currentWord.vocabularyid, quality);

      if (res.success && res.data) {
        const updatedData = res.data;
        setVocabulary((prev) =>
          prev.map((v) =>
            v.vocabularyid === updatedData.vocabularyid
              ? {
                  ...v,
                  proficiency: updatedData.proficiency,
                  nextReviewAt: updatedData.nextReviewAt,
                }
              : v,
          ),
        );
      } else {
        toast.error("网络错误，保存进度失败");
      }

      setIsSubmitting(false);
      if (currentReviewIndex < reviewQueue.length - 1) {
        setIsCardFlipped(false);
        setCurrentReviewIndex((prev) => prev + 1);
      } else {
        if (onComplete) {
          onComplete();
        } else {
          setIsReviewOpen(false);
          toast.success("恭喜！今日复习任务已完成 🎉");
        }
      }
    },
    [currentReviewIndex, isSubmitting, reviewQueue],
  );

  const retryForgotten = useCallback(
    (forgottenIds: number[]) => {
      const forgotten = vocabulary.filter((v) =>
        forgottenIds.includes(v.vocabularyid),
      );
      if (forgotten.length === 0) {
        setIsReviewOpen(false);
        toast.success("所有生词都已掌握！🎉");
        return;
      }
      setReviewQueue(forgotten);
      setCurrentReviewIndex(0);
      setIsCardFlipped(false);
    },
    [vocabulary],
  );

  const toggleStatus = useCallback(
    async (id: number, currentStatus?: "LEARNING" | "MASTERED") => {
      const newStatus = currentStatus === "MASTERED" ? "LEARNING" : "MASTERED";
      const res = await updateVocabularyStatusAction(id, newStatus);
      if (res.success) {
        setVocabulary((prev) =>
          prev.map((v) =>
            v.vocabularyid === id ? { ...v, status: newStatus } : v,
          ),
        );
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    },
    [],
  );

  const deleteVocabulary = useCallback(async (id: number) => {
    try {
      const res = await fetch("/api/vocabulary/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vocabularyid: id }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setVocabulary((prev) => prev.filter((v) => v.vocabularyid !== id));
        toast.success("已从生词本中彻底删除");
      } else {
        toast.error(data.message || "删除失败");
      }
    } catch (err) {
      console.error(err);
      toast.error("网络错误，删除失败");
    }
  }, []);

  return {
    vocabulary,
    searchQuery,
    setSearchQuery,
    sortMethod,
    setSortMethod,
    filterStatus,
    setFilterStatus,
    expandedId,
    setExpandedId,
    isReviewOpen,
    setIsReviewOpen,
    reviewQueue,
    currentReviewIndex,
    isCardFlipped,
    setIsCardFlipped,
    isSubmitting,
    playingText,
    stopAllAudio,
    stats,
    filteredList,
    playAudio,
    playContextAudio,
    startReview,
    handleSRS,
    toggleStatus,
    deleteVocabulary,
    retryForgotten,
  };
}

export type UseVocabularyNotebookReturn = ReturnType<
  typeof useVocabularyNotebook
>;
