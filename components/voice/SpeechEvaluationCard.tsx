/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import {
  Mic,
  Square,
  RotateCcw,
  Volume2,
  Volume1,
  Cpu,
  Play,
  Pause,
  BotMessageSquare,
  Info,
  Languages,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Layers,
  Bookmark,
  Repeat,
  Repeat1,
  Lock,
  Crown,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { SpeechPracticeRecord, Subtitle } from "@/lib/types";
import WordScoreBadge from "./WordScoreBadge";
import { useSpeechEvaluation } from "./hooks/useSpeechEvaluation";
import { useUIStore } from "@/store/ui-store";
import type { EvalScenario } from "@/core/speech/speech-evaluate.service";
import { useWordHighlight } from "@/components/transcript/useWordHighlight";
import { PRACTICE_FONT_SIZE_LEVELS } from "@/store/practice-settings-store";
import type { TextMode } from "@/store/practice-settings-store";
import { VocabularyModal } from "@/components/episode/transcript/VocabularyModal";
import type { DictEntryDTO } from "@/core/dictionary/dto";
import { handleDictionaryQuotaBlock } from "@/lib/client/dictionary-quota";
import { handleVocabularyQuotaBlock } from "@/lib/client/vocabulary-quota";
import { toggleSentenceSave } from "@/lib/actions/sentences-actions";
import { shouldPreviewSentenceQuota } from "@/lib/quota";
import {
  isSentenceQuotaBlocked,
  handleSentenceQuotaBlock,
} from "@/lib/client/sentence-quota";
import {
  isSentenceStaged,
  removeStagedSentence,
  subscribeStaging,
} from "@/lib/client/sentence-staging";
import { QuickTagDrawer } from "@/components/sentence/QuickTagDrawer";
import type { SavedSentenceItem } from "@/core/sentences/dto";

/**
 * 按集缓存的「句子本已收藏 subtitleId 集合」：
 * 列表页（如语音评测主页）会渲染多张卡片，共享同一次 /api/sentences/keys 请求。
 */
const savedSentenceKeysCache = new Map<string, Promise<Set<number>>>();
function fetchSavedSentenceKeys(episodeid: string): Promise<Set<number>> {
  let cached = savedSentenceKeysCache.get(episodeid);
  if (!cached) {
    cached = fetch(`/api/sentences/keys?episodeid=${episodeid}`)
      .then((r) => r.json())
      .then((d) =>
        d.success && d.data && Array.isArray(d.data.subtitleIds)
          ? new Set<number>(d.data.subtitleIds)
          : new Set<number>(),
      )
      .catch(() => new Set<number>());
    savedSentenceKeysCache.set(episodeid, cached);
  }
  return cached;
}

/**
 * 清洗词典音标，供音标文本模式（textMode = "ipa"）句内逐词拼接展示：
 * 1) 移除定冠词等弱读变体提示 "(before vowels: /ði/)"（连同前导空白，避免留下尾空格）；
 * 2) 移除所有斜杠分隔符（含复合标注内残留的孤立斜杠）；
 * 3) 压缩连续空格并 trim，保证拼接后不会出现双空格。
 * 例："/ðə/ (before vowels: /ði/)" → "ðə"；"/sʌm/" → "sʌm"；"/gəʊ / " → "gəʊ"。
 */
function cleanIpa(raw: string): string {
  return raw
    .replace(/\s*\(before vowels:[^)]*\)/gi, "")
    .replace(/\//g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface SpeechEvaluationCardProps {
  subtitle: Subtitle;
  audioUrl: string; // 原音 URL
  previousResult?: SpeechPracticeRecord;
  onEvaluate: (
    subtitleId: number,
    recordedText: string,
    score: number,
    fullRecord?: any,
    rawDetails?: any,
    audioBase64?: string,
  ) => void;
  currentPlayingId: number | null;
  onPlayStart: (id: number) => void;
  isActive: boolean;
  onActivate: () => void;
  historicalRecords?: SpeechPracticeRecord[];
  // ── 设置中心透传（全部 optional，向后兼容） ──
  fontSizeLevel?: number; // 0-2
  showTranslation?: boolean; // 是否显示中文翻译（默认 false：收起，点翻译图标展开）
  showIpa?: boolean; // 结果区显示音素诊断
  textMode?: TextMode; // 原文 / 音标 / 盲读遮罩
  passThreshold?: number; // 过关分数线（结果区达标标记/文案）
  episodeId?: string; // 用于保存生词到生词本
  episodeTitle?: string; // 词典弹框来源标题
  // ── 退出插槽：传入时结果区底部改为「再试一次（居左）+ 返回按钮（居右）」两端布局 ──
  onExit?: () => void;
  // ── 返回滑动卡片复习插槽：传入时在「返回句子本」左侧追加该按钮 ──
  onBackToDeck?: () => void;
  // ── [P3-b] 评测场景双池：learn=月池 speech_quota / review=日池 review_eval_quota ──
  evalScenario?: EvalScenario;
  // ── [P3-b] 配额触墙置锁（父层 /api/speech/quota 预检传入；卡内触墙自动追加）──
  quotaLocked?: boolean;
}

const SpeechEvaluationCard: React.FC<SpeechEvaluationCardProps> = ({
  subtitle,
  audioUrl,
  previousResult,
  onEvaluate,
  currentPlayingId,
  onPlayStart,
  isActive,
  onActivate,
  historicalRecords,
  fontSizeLevel = 1,
  showTranslation = false,
  showIpa = true,
  textMode = "normal",
  passThreshold = 80,
  episodeId,
  episodeTitle,
  onExit,
  onBackToDeck,
  evalScenario = "learn",
  quotaLocked = false,
}) => {
  const { data: session } = useSession();

  // [P3-b] 配额置锁：父层预检（quotaLocked）或本卡评测触墙后锁定评分入口
  const [quotaWallHit, setQuotaWallHit] = React.useState(false);
  const isEvalLocked = quotaLocked || quotaWallHit;
  const quotaModalSource =
    evalScenario === "review" ? "review_eval_quota" : "speech_quota";
  const quotaLockedLabel =
    evalScenario === "review" ? "今日免费跟读评测已用完" : "本月免费评测已用完";

  // ── 单句循环：句尾自然结束回调（ref 保持引用稳定，重播函数在 effect 中刷新） ──
  const isLoopingRef = React.useRef(false);
  const lastPlayRateRef = React.useRef(1.0); // 记住用户最近一次手动选择的原声/慢速率
  const replayRef = React.useRef<() => void>(() => {});
  const handleReferenceEnd = React.useCallback(() => {
    if (isLoopingRef.current) replayRef.current();
  }, []);

  const {
    isRecording,
    isProcessing,
    result,
    refAudioProgress,
    isUserAudioPlaying,
    isSpeaking,
    isTTSLoading,
    speakWithTTS,
    playDictAudio,
    startRecording,
    stopRecording,
    playReferenceAudio,
    toggleUserAudio,
    highlightController,
  } = useSpeechEvaluation({
    subtitle,
    audioUrl,
    previousResult,
    onEvaluate,
    currentPlayingId,
    onPlayStart: (id) => {
      onPlayStart(id);
      onActivate();
    },
    onReferenceEnd: handleReferenceEnd,
    scenario: evalScenario,
    onQuotaBlocked: () => setQuotaWallHit(true),
  });

  const [activeWordIndex, setActiveWordIndex] = React.useState<number | null>(
    null,
  );
  // 翻译按钮（移动端句尾 / 桌面端英文句尾内联，两处共用）的本地覆盖；
  // 初值与设置面板的 showTranslation 一致（默认不显示中文）。
  // 当设置面板改变 showTranslation 时（如切换开关），清除此覆盖，
  // 使「显示中文翻译」开关即时生效；换句时也清除以回归设置默认。
  const [translationOverride, setTranslationOverride] = React.useState<
    boolean | null
  >(null);
  const showCn = translationOverride ?? showTranslation;
  const handleToggleTranslation = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setTranslationOverride(!showCn);
  };
  React.useEffect(() => {
    setTranslationOverride(null);
  }, [showTranslation, subtitle]);
  const [showDetails, setShowDetails] = React.useState(false);

  // ── 点词查询 / 生词本相关状态 ──
  const [selectedWord, setSelectedWord] = React.useState<string>("");
  const [selectedContext, setSelectedContext] = React.useState<string>("");
  const [selectedTranslation, setSelectedTranslation] =
    React.useState<string>("");
  const [dictData, setDictData] = React.useState<DictEntryDTO | null>(null);
  const [isDictModalOpen, setIsDictModalOpen] = React.useState(false);
  const [isLoadingDefinition, setIsLoadingDefinition] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [globalVocabWords, setGlobalVocabWords] = React.useState<Set<string>>(
    new Set(),
  );

  // 登录后获取已保存的生词列表（用于标记已保存状态）
  React.useEffect(() => {
    if (!session?.user) {
      setGlobalVocabWords(new Set());
      return;
    }
    let cancelled = false;
    fetch("/api/vocabulary/words")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.success && Array.isArray(d.data)) {
          setGlobalVocabWords(new Set(d.data));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session]);

  // ── 点词查询回调 ──
  const handleWordClick = React.useCallback(
    async (word: string) => {
      const cleanWord = word.replace(/[.,!?;:"'()[\]{}]/g, "").trim();
      if (!cleanWord) return;

      setSelectedWord(cleanWord);
      setSelectedContext(subtitle.textEn);
      setSelectedTranslation(subtitle.textCn || "");
      setDictData(null);
      setIsDictModalOpen(true);
      setIsLoadingDefinition(true);

      try {
        const res = await fetch(
          `/api/dict/${encodeURIComponent(cleanWord.toLowerCase())}`,
        );
        if (res.ok) {
          const json = await res.json();
          if (handleDictionaryQuotaBlock(json)) return;
          if (json.success && json.data) {
            setDictData(json.data as DictEntryDTO);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingDefinition(false);
      }
    },
    [subtitle],
  );

  // ── 保存生词回调 ──
  const handleSaveVocabulary = React.useCallback(async () => {
    if (!selectedWord) return;
    if (!session?.user) {
      toast.error("请先登录后再保存生词");
      return;
    }

    const definition =
      dictData?.definitions
        ?.map((d) => `[${d.pos}] ${d.meaning_cn}`)
        .join("; ") || "";

    setIsSaving(true);
    try {
      const res = await fetch("/api/vocabulary/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: selectedWord,
          definition,
          contextSentence: selectedContext,
          translation: selectedTranslation,
          episodeid: episodeId || "",
          timestamp: subtitle.startSeconds,
          speakUrl: dictData?.audio_urls?.us || "",
          dictUrl: "",
          webUrl: "",
          mobileUrl: "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "已加入生词本");
        setGlobalVocabWords((prev) => {
          const newSet = new Set(prev);
          newSet.add(selectedWord.toLowerCase());
          return newSet;
        });
        setIsDictModalOpen(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        // [P1-1] 生词配额拦截走会员弹窗承接（含埋点），不再只弹错误 toast
        if (handleVocabularyQuotaBlock(errorData)) return;
        toast.error(errorData.message || "保存失败");
      }
    } catch (error) {
      console.error(error);
      toast.error("网络错误");
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedWord,
    session,
    dictData,
    selectedContext,
    selectedTranslation,
    episodeId,
    subtitle.startSeconds,
  ]);

  const [playMode, setPlayMode] = React.useState<"normal" | "slow" | null>(
    null,
  );

  // ── 单句循环 ──
  const [isLooping, setIsLooping] = React.useState(false);
  // 换句复位循环状态与播放速率记忆
  React.useEffect(() => {
    setIsLooping(false);
    isLoopingRef.current = false;
    lastPlayRateRef.current = 1.0;
  }, [subtitle.id]);

  // 句尾重播：按用户最近一次选择的速率（原声 1.0 / 慢速 0.75）循环当前句
  React.useEffect(() => {
    replayRef.current = () => {
      const rate = lastPlayRateRef.current;
      setPlayMode(rate < 1 ? "slow" : "normal");
      playReferenceAudio(rate);
    };
  }, [playReferenceAudio]);

  const handleToggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    isLoopingRef.current = next;
    if (next && refAudioProgress <= 0) {
      // 开启循环时若当前无原声在播，直接开始播放当前句
      lastPlayRateRef.current = 1.0;
      setPlayMode("normal");
      playReferenceAudio(1.0);
    }
  };

  // ── 收藏句子（句子本）──
  const [isSentenceSaved, setIsSentenceSaved] = React.useState(false);
  // [P3-a] 已暂存（免费容量满：半亮 PRO 徽记态，再点取消暂存）
  const [isStagedSent, setIsStagedSent] = React.useState(false);
  // [P3-a] 80% 预告单集会话只提示一次
  const quotaPreviewShownRef = React.useRef(false);
  const [tagDrawerSentence, setTagDrawerSentence] =
    React.useState<SavedSentenceItem | null>(null);

  // [P3-d] 智能收藏推荐（报告 4.6）：60-79 分 = 会了但不稳，
  // 高亮书签引导把有限收藏配额投向最值得反复练的句子
  const latestScore = result
    ? (result.overallScore ?? result.accuracyScore ?? 0)
    : 0;
  const recommendSave =
    !!result &&
    latestScore >= 60 &&
    latestScore < 80 &&
    !isSentenceSaved &&
    !isStagedSent;

  // 登录且有所属集时，从缓存拉取本集已收藏的 subtitleId 标记初始书签态
  React.useEffect(() => {
    if (!episodeId || !session?.user) {
      setIsSentenceSaved(false);
      setIsStagedSent(false);
      return;
    }
    let cancelled = false;
    fetchSavedSentenceKeys(episodeId).then((keys) => {
      if (!cancelled) setIsSentenceSaved(keys.has(subtitle.id));
    });
    setIsStagedSent(
      isSentenceStaged({
        episodeid: episodeId,
        subtitleId: subtitle.id,
        startTime: subtitle.startSeconds,
      }),
    );
    // [P3-a] 订阅暂存区变更（本句被浮卡/管理器补提交或取消时同步三态）
    const unsubscribe = subscribeStaging(() => {
      setIsStagedSent(
        isSentenceStaged({
          episodeid: episodeId,
          subtitleId: subtitle.id,
          startTime: subtitle.startSeconds,
        }),
      );
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [episodeId, session?.user, subtitle.id, subtitle.startSeconds]);

  const handleToggleSentenceSave = React.useCallback(() => {
    if (!session?.user) {
      toast("请先登录", { description: "登录后即可收藏句子到句子本" });
      const loginModal = document.getElementById(
        "email_check_modal_box",
      ) as HTMLDialogElement | null;
      if (loginModal) loginModal.showModal();
      return;
    }
    if (!episodeId) return;

    // [P3-a] 已暂存的句子再点书签 = 取消暂存（不落库）
    if (isStagedSent) {
      removeStagedSentence({
        episodeid: episodeId,
        subtitleId: subtitle.id,
        startTime: subtitle.startSeconds,
      });
      setIsStagedSent(false);
      toast("已取消暂存该句");
      return;
    }

    // 乐观翻转书签态，server action 落库后校正/回滚
    setIsSentenceSaved((v) => !v);
    React.startTransition(async () => {
      try {
        const res = await toggleSentenceSave({
          episodeid: episodeId,
          subtitleId: subtitle.id,
          startTime: subtitle.startSeconds,
          endTime: subtitle.endSeconds ?? subtitle.startSeconds + 3,
          enText: subtitle.textEn,
          zhText: (subtitle.textCn || "").replace(/\[SPEAKER_\d+\]:\s*/g, ""),
        });
        if (res.success && res.data) {
          setIsSentenceSaved(res.data.saved);
          if (res.data.saved && res.data.sentence) {
            const saved = res.data.sentence;
            // [P3-a] 80% 预告：第 24 条起在成功 toast 内单独一行醒目提示（单集
            // 会话只提示一次；不另起 toast——堆叠会遮挡"添加标签/笔记"操作）
            const total = res.data.totalCount;
            const limit = res.data.limit;
            let previewLine: React.ReactNode = null;
            if (
              total != null &&
              limit != null &&
              shouldPreviewSentenceQuota(total, limit) &&
              !quotaPreviewShownRef.current
            ) {
              quotaPreviewShownRef.current = true;
              previewLine = (
                <span className="mt-1.5 block rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  句子本还剩 {limit - total} 个位置
                </span>
              );
            }
            toast.success("已收藏至「句子本」", {
              description: (
                <>
                  {`"${subtitle.textEn.slice(0, 32)}..."`}
                  {previewLine}
                </>
              ),
              action: {
                label: "添加标签/笔记",
                onClick: () => setTagDrawerSentence(saved),
              },
            });
          } else {
            toast("已从「句子本」移除");
          }
        } else if (isSentenceQuotaBlocked(res)) {
          // [P3-a] 免费容量触墙：入暂存 + 浮卡承接。
          // 暂存浮卡由用户点收藏触发，天然不会先于评测成绩展示（公理 3）
          setIsSentenceSaved(false);
          handleSentenceQuotaBlock(
            {
              episodeid: episodeId,
              subtitleId: subtitle.id,
              startTime: subtitle.startSeconds,
              endTime: subtitle.endSeconds ?? subtitle.startSeconds + 3,
              enText: subtitle.textEn,
              zhText: (subtitle.textCn || "").replace(
                /\[SPEAKER_\d+\]:\s*/g,
                "",
              ),
            },
            {
              totalCount: res.data?.totalCount ?? 0,
              limit: res.data?.limit ?? 0,
            },
          );
          setIsStagedSent(true);
        } else {
          setIsSentenceSaved((v) => !v); // 回滚
          toast.error(res.message || "收藏失败，请重试");
        }
      } catch {
        setIsSentenceSaved((v) => !v); // 回滚
        toast.error("网络错误，收藏失败");
      }
    });
  }, [session, episodeId, subtitle, isStagedSent]);

  // 文本模式相关
  // ipa: word -> 音标字符串（去标点后的词为 key）。用 ref 缓存，跨 subtitle 复用。
  const ipaCacheRef = React.useRef<Record<string, string>>({});
  const [ipaMap, setIpaMap] = React.useState<Record<string, string>>({});

  // blind 盲读：仅当本轮产生了「新的」评测结果时才自动揭示文本对照，
  // 避免回看已练习过的句子（有 previousResult）时直接显示原文、破坏盲读。
  // 新旧结果以 recognitionid 区分（新结果 id = Date.now()，与 previousResult 不同）。
  const [blindRevealed, setBlindRevealed] = React.useState(false);
  React.useEffect(() => {
    // 换句时复位揭示状态
    setBlindRevealed(false);
  }, [subtitle]);
  React.useEffect(() => {
    if (
      result &&
      previousResult &&
      result.recognitionid !== previousResult.recognitionid
    ) {
      setBlindRevealed(true);
    } else if (result && !previousResult) {
      setBlindRevealed(true);
    }
  }, [result, previousResult]);
  // 盲读遮罩是否显示：未揭示时遮挡
  const isBlindMasked = !blindRevealed;

  const textRef = React.useRef<HTMLHeadingElement>(null);
  // 仅原声/慢速播放时随语速线性扫光；TTS/停止时不点亮
  const hlWords = subtitle.words;
  useWordHighlight({
    controller: highlightController,
    containerRef: textRef,
    isHighlighted: true,
    words: hlWords,
    start:
      hlWords && hlWords.length > 0 ? hlWords[0].start : subtitle.startSeconds,
    end:
      hlWords && hlWords.length > 0
        ? hlWords[hlWords.length - 1].end
        : (subtitle.endSeconds ?? subtitle.startSeconds + 3),
  });

  React.useEffect(() => {
    if (refAudioProgress === 0) {
      setPlayMode(null);
    }
  }, [refAudioProgress]);

  // 文本模式 = 音标时：为当前句的去标点 unique 词批量取 IPA（带 ref 缓存，避免重复请求）
  React.useEffect(() => {
    if (textMode !== "ipa") return;
    const words = (
      subtitle.words && subtitle.words.length > 0
        ? subtitle.words.map((w) => w.word)
        : subtitle.textEn.split(/\s+/)
    )
      .map((w) => w.replace(/[.,!?;:"'()[\]{}]/g, "").toLowerCase())
      .filter((w) => w.length > 0);
    const uniqueWords = Array.from(new Set(words));
    const missing = uniqueWords.filter((w) => !(w in ipaCacheRef.current));
    if (missing.length === 0) {
      // 全部命中缓存：直接同步到 state
      const picked: Record<string, string> = {};
      uniqueWords.forEach((w) => (picked[w] = ipaCacheRef.current[w]));
      setIpaMap(picked);
      return;
    }
    let cancelled = false;
    Promise.all(
      missing.map(async (w) => {
        try {
          const res = await fetch(`/api/dict/${encodeURIComponent(w)}`);
          if (!res.ok) return null;
          const json = await res.json();
          if (json.success && json.data) {
            const us = json.data.phonetics?.us || "";
            return [w, us] as const;
          }
        } catch {
          /* ignore single-word failure */
        }
        return null;
      }),
    ).then((entries) => {
      if (cancelled) return;
      const picked: Record<string, string> = {};
      entries.forEach((e) => {
        if (e) {
          ipaCacheRef.current[e[0]] = e[1];
        }
      });
      uniqueWords.forEach((w) => (picked[w] = ipaCacheRef.current[w] ?? ""));
      setIpaMap(picked);
    });
    return () => {
      cancelled = true;
    };
  }, [textMode, subtitle]);

  const handleStartRecording = () => {
    // [P3-b] 配额触墙后评分入口置锁：点击/Space 统一改开会员弹窗，不再起录音
    if (isEvalLocked) {
      useUIStore.getState().openPremiumModal(quotaModalSource);
      return;
    }
    onActivate();
    startRecording();
  };

  // Space 键切换录音：空闲→开始，录音中→停止；处理中或长按重复时忽略。
  // 焦点在可交互元素（按钮/输入框等）上时不拦截，交给浏览器默认行为。
  React.useEffect(() => {
    if (!isActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      // 长按重复
      if (e.repeat) return;
      // 焦点在输入/可编辑元素：让浏览器处理（避免打断输入）
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      // 焦点在按钮/链接上时，Space 会激活它，不拦截
      if (tag === "BUTTON" || tag === "A") return;

      e.preventDefault();
      if (isProcessing) return;
      if (isRecording) {
        stopRecording();
      } else {
        handleStartRecording();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive, isRecording, isProcessing]);

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-primary-600";
    if (score >= 60) return "text-accent-600";
    return "text-error-600";
  };

  return (
    <>
      <div
        className={`bg-base-100 rounded-3xl border border-base-200 shadow-xl transition-all duration-500 overflow-hidden ${
          isActive
            ? "scale-100 opacity-100 ring-2 ring-primary-600/30 dark:ring-primary-400/30"
            : "scale-[0.96] opacity-50 hover:opacity-80 cursor-pointer"
        }`}
        onClick={() => {
          if (!isActive) onActivate();
        }}
      >
        {/* 1. 顶部：待朗读核心卡片区 */}
        <div className="p-4 md:p-6 lg:p-8">
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <button
              onClick={(e) => {
                e.stopPropagation();
                speakWithTTS();
              }}
              disabled={isTTSLoading}
              className={`btn btn-sm rounded-full border bg-transparent transition-colors ${
                isSpeaking
                  ? "border-primary-400 text-primary-600 bg-primary-50 shadow-inner"
                  : "border-primary-200 text-primary-600 hover:bg-primary-50 hover:border-primary-300"
              }`}
            >
              {isTTSLoading ? (
                <span className="loading loading-spinner loading-xs text-primary-600"></span>
              ) : (
                <BotMessageSquare size={16} />
              )}
              <span className="hidden md:inline">AI 朗读</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                lastPlayRateRef.current = 1.0;
                setPlayMode("normal");
                playReferenceAudio();
              }}
              className="btn btn-sm rounded-full border border-primary-200 text-primary-600 bg-transparent hover:bg-primary-50 hover:border-primary-300 relative overflow-hidden group transition-colors"
            >
              {refAudioProgress > 0 && playMode === "normal" && (
                <div
                  className="absolute left-0 top-0 bottom-0 bg-primary-100 transition-all duration-75"
                  style={{ width: `${refAudioProgress}%` }}
                />
              )}
              <Volume2 size={16} className="relative z-10" />
              <span className="relative z-10 hidden md:inline">原声播放</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                lastPlayRateRef.current = 0.75;
                setPlayMode("slow");
                playReferenceAudio(0.75);
              }}
              className="btn btn-sm rounded-full border border-primary-200 text-primary-600 bg-transparent hover:bg-primary-50 hover:border-primary-300 relative overflow-hidden group transition-colors"
            >
              {refAudioProgress > 0 && playMode === "slow" && (
                <div
                  className="absolute left-0 top-0 bottom-0 bg-primary-100 transition-all duration-75"
                  style={{ width: `${refAudioProgress}%` }}
                />
              )}
              <Volume1 size={16} className="relative z-10" />
              <span className="relative z-10 hidden md:inline">慢速播放</span>
            </button>

            {/* 收藏句子（句子本）— 已收藏呈暖金高亮实心书签；[P3-a] 暂存半亮态 */}
            {episodeId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleSentenceSave();
                }}
                className={`btn btn-sm rounded-full border bg-transparent transition-all ${
                  isSentenceSaved
                    ? "border-amber-300 bg-amber-50 text-amber-500 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400"
                    : isStagedSent
                      ? // [P3-a] 半亮 PRO 徽记态：视觉"已记下"而非失败
                        "border-amber-300/60 bg-amber-50/50 text-amber-500/70 hover:bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/5 dark:text-amber-400/70"
                      : recommendSave
                        ? // [P3-d] 智能收藏推荐：60-79 分高亮书签（点击即收）
                          "border-amber-400 bg-amber-50 text-amber-600 ring-2 ring-amber-400/60 shadow-md shadow-amber-400/20 hover:bg-amber-100 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-400"
                        : "border-ink-200 text-ink-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-500 dark:border-ink-600 dark:text-ink-300 dark:hover:text-amber-400"
                }`}
                aria-pressed={isSentenceSaved || isStagedSent}
                aria-label={
                  isSentenceSaved
                    ? "取消收藏该句"
                    : isStagedSent
                      ? "取消暂存该句"
                      : "收藏该句到句子本"
                }
                title={
                  isSentenceSaved
                    ? "取消收藏"
                    : isStagedSent
                      ? "已暂存（升级后自动入库）· 点击取消暂存"
                      : recommendSave
                        ? "这句值得收进句子本反复练 · 点击收藏"
                        : "收藏句子"
                }
              >
                <Bookmark
                  size={16}
                  fill={isSentenceSaved ? "currentColor" : "none"}
                />
                <span className="hidden md:inline">
                  {isSentenceSaved
                    ? "已收藏"
                    : isStagedSent
                      ? "暂存·PRO"
                      : "收藏句子"}
                </span>
              </button>
            )}

            {/* 单句循环 — 开启后原声播至句尾自动重播（沿用最近一次的播放速率） */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleLoop();
              }}
              className={`btn btn-sm rounded-full border bg-transparent transition-colors ${
                isLooping
                  ? "border-primary-400 text-primary-600 bg-primary-50 shadow-inner"
                  : "border-ink-200 text-ink-500 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 dark:border-ink-600 dark:text-ink-300 dark:hover:text-primary-400"
              }`}
              aria-pressed={isLooping}
              title={isLooping ? "取消单句循环" : "单句循环"}
            >
              {isLooping ? <Repeat1 size={16} /> : <Repeat size={16} />}
              <span className="hidden md:inline">
                {isLooping ? "循环中" : "单句循环"}
              </span>
            </button>
          </div>

          <div className="space-y-4">
            <h3
              ref={textRef}
              className={`${
                PRACTICE_FONT_SIZE_LEVELS[fontSizeLevel]?.className ??
                PRACTICE_FONT_SIZE_LEVELS[1].className
              } font-bold text-base-content leading-relaxed font-sans tracking-wide`}
            >
              {(subtitle.words && subtitle.words.length > 0
                ? subtitle.words.map((wordObj) => wordObj.word)
                : subtitle.textEn.split(/\s+/)
              ).map((word, idx) => {
                const cleanWord = word.replace(/[.,!?;:"'()[\]{}]/g, "");
                const isDifficult = cleanWord.length > 6;

                if (textMode === "blind" && isBlindMasked) {
                  // 盲读遮罩：等宽占位条，保留词间距与节奏
                  return (
                    <span
                      key={idx}
                      data-wi={idx}
                      className="inline-block mr-2 align-bottom select-none"
                      style={{
                        width: `${Math.max(2, word.length) * 0.62}em`,
                        height: "1.1em",
                      }}
                    >
                      <span className="block w-full h-full rounded bg-ink-200 dark:bg-ink-700 blur-[2px]" />
                    </span>
                  );
                }

                if (textMode === "ipa") {
                  // 词典返回的 phonetics.us 形如 "/ˈskedʒuːl/"，也可能带弱读变体提示
                  // （"/ðə/ (before vowels: /ði/)"）；cleanIpa 统一剥离斜杠与提示段后显示。
                  const rawIpa = ipaMap[cleanWord.toLowerCase()];
                  const ipa = rawIpa ? cleanIpa(rawIpa) : "";
                  return (
                    <span
                      key={idx}
                      data-wi={idx}
                      className="relative inline-block mr-2 group"
                    >
                      <span
                        className={`cursor-pointer transition-colors hover:text-primary-600 dark:hover:text-primary-400 font-mono ${
                          isDifficult
                            ? "underline decoration-base-300 decoration-dotted underline-offset-8"
                            : ""
                        } ${
                          globalVocabWords.has(cleanWord.toLowerCase())
                            ? "text-primary-500 dark:text-primary-400"
                            : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWordClick(word);
                        }}
                      >
                        {ipa || word}
                      </span>
                    </span>
                  );
                }

                // normal 原文模式
                return (
                  <span key={idx} className="relative inline-block mr-2 group">
                    <span
                      data-wi={idx}
                      className={`cursor-pointer transition-colors hover:text-primary-600 dark:hover:text-primary-400 ${
                        isDifficult
                          ? "underline decoration-base-300 decoration-dotted underline-offset-8"
                          : ""
                      } ${
                        globalVocabWords.has(cleanWord.toLowerCase())
                          ? "text-primary-500 dark:text-primary-400"
                          : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWordClick(word);
                      }}
                    >
                      {word}
                    </span>
                  </span>
                );
              })}
              {/* 翻译开关：移动端与桌面端各一个按钮，均内联跟排在英文原句正末尾。
                  showCn 激活时高亮，与设置面板「显示中文翻译」开关联动。 */}
              <button
                onClick={handleToggleTranslation}
                aria-pressed={showCn}
                title={showCn ? "隐藏中文翻译" : "显示中文翻译"}
                className={`inline-flex md:hidden items-center justify-center p-1.5 ml-1 rounded-lg transition-colors align-middle ${
                  showCn
                    ? "text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/30"
                    : "text-ink-400 hover:text-primary-600 hover:bg-primary-50"
                }`}
              >
                <Languages size={20} />
              </button>
              <button
                onClick={handleToggleTranslation}
                aria-pressed={showCn}
                title={showCn ? "隐藏中文翻译" : "显示中文翻译"}
                className={`hidden md:inline-flex items-center justify-center p-1.5 ml-2 rounded-lg transition-colors align-middle ${
                  showCn
                    ? "text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/30"
                    : "text-ink-400 hover:text-primary-600 hover:bg-primary-50"
                }`}
              >
                <Languages size={20} />
              </button>
            </h3>
            {subtitle.textCn && (
              <p
                className={`text-base md:text-lg text-base-content/60 font-medium animate-in slide-in-from-top-2 ${showCn ? "block" : "hidden"}`}
              >
                {subtitle.textCn.replace(/\[SPEAKER_\d+\]:\s*/g, "")}
              </p>
            )}

            {textMode === "blind" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setBlindRevealed((v) => !v);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 dark:bg-primary-900/30 px-2.5 py-1 rounded-full transition-colors"
                title="显示/隐藏原文"
              >
                <span className="material-symbols-outlined text-sm">
                  {isBlindMasked ? "visibility" : "visibility_off"}
                </span>
                {isBlindMasked ? "显示原文" : "重新遮挡"}
              </button>
            )}
          </div>
        </div>

        {/* 2. 中央：录音交互核心区 */}
        {(!result || isRecording || isProcessing) && (
          <div className="bg-base-200/50 border-y border-base-200 p-8 flex flex-col items-center justify-center min-h-[180px] relative overflow-hidden">
            {/* [P3-b] 配额触墙置锁：评分按钮改开会员弹窗（review_eval_quota / speech_quota） */}
            {!isRecording && !isProcessing && isEvalLocked && (
              <div className="flex flex-col items-center gap-3 animate-in zoom-in duration-300">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    useUIStore.getState().openPremiumModal(quotaModalSource);
                  }}
                  className="w-20 h-20 rounded-full bg-base-100 border-2 border-dashed border-amber-400 dark:border-amber-500/60 text-amber-500 flex items-center justify-center shadow-lg hover:scale-105 transition-all duration-300"
                  aria-label="评测次数已用完，升级 PRO 解锁"
                  title={quotaLockedLabel}
                >
                  <Lock size={30} />
                </button>
                <span className="text-sm font-bold text-base-content/60">
                  {quotaLockedLabel}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    useUIStore.getState().openPremiumModal(quotaModalSource);
                  }}
                  className="btn btn-sm rounded-full border-0 bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                >
                  <Crown size={14} />
                  解锁无限评测
                </button>
              </div>
            )}

            {!isRecording && !isProcessing && !isEvalLocked && (
              <div className="flex flex-col items-center gap-3 animate-in zoom-in duration-300">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartRecording();
                  }}
                  className="w-20 h-20 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-2xl shadow-primary-600/40 hover:scale-105 hover:bg-primary-700 transition-all duration-300"
                >
                  <Mic size={32} />
                </button>
                <span className="text-sm font-bold text-base-content/50 uppercase tracking-widest">
                  点击录音
                </span>
                <span className="hidden lg:inline text-xs text-base-content/40">
                  或按{" "}
                  <kbd className="px-1.5 py-0.5 rounded border border-base-300 bg-base-100 text-[10px] font-bold text-base-content/70">
                    Space
                  </kbd>{" "}
                  开始 / 停止
                </span>
              </div>
            )}

            {isRecording && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="relative">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-error-400 opacity-75 animate-ping"></span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stopRecording();
                    }}
                    className="relative w-16 h-16 rounded-full bg-error-500 text-white flex items-center justify-center shadow-xl hover:bg-error-600 transition-colors"
                  >
                    <Square size={24} fill="currentColor" />
                  </button>
                </div>
                <p className="text-sm font-medium text-error-500 animate-pulse">
                  正在录音... 点击停止
                </p>
                {/* Fake Visualizer */}
                <div className="flex items-center gap-1 h-6">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-error-400 rounded-full animate-bounce"
                      style={{
                        height: `${Math.random() * 20 + 4}px`,
                        animationDuration: `${0.5 + Math.random() * 0.5}s`,
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <Cpu className="text-primary-600 animate-spin" size={32} />
                <p className="text-sm font-bold text-primary-600">
                  正在分析发音...
                </p>
              </div>
            )}
          </div>
        )}

        {/* 3. 下方：评测结果与反馈区 */}
        {!isRecording && !isProcessing && result && (
          <div className="p-4 md:p-6 lg:p-8 bg-base-100 animate-in slide-in-from-bottom-4 duration-500">
            {/* [P3-d] 智能收藏推荐：60-79 分区间提示（书签同步高亮） */}
            {recommendSave && episodeId && (
              <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-amber-300/60 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-4 py-3">
                <Bookmark size={16} className="text-amber-500 shrink-0" />
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  得分 {Math.round(latestScore)}
                  ——会了还不稳，这句值得收进句子本反复练
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSentenceSave();
                  }}
                  className="ml-auto btn btn-xs rounded-full border-0 bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                >
                  收藏
                </button>
              </div>
            )}
            {(() => {
              const pastRecords =
                historicalRecords?.filter(
                  (r) => r.recognitionid !== result.recognitionid,
                ) || [];
              const pastScores = pastRecords.map(
                (r) => r.overallScore ?? r.accuracyScore ?? 0,
              );
              const highestPastScore =
                pastScores.length > 0 ? Math.max(...pastScores) : null;
              const currentScore =
                result.overallScore ?? result.accuracyScore ?? 0;
              const isNewBest =
                highestPastScore !== null && currentScore > highestPastScore;
              const improvement = isNewBest
                ? currentScore - (highestPastScore as number)
                : 0;
              const lastAttemptScore =
                pastRecords.length > 0
                  ? (pastRecords[0].overallScore ??
                    pastRecords[0].accuracyScore ??
                    0)
                  : null;
              const isImprovement =
                !isNewBest &&
                lastAttemptScore !== null &&
                currentScore > lastAttemptScore;

              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                  {/* 左侧：综合得分 */}
                  <div className="lg:col-span-4 flex flex-row md:flex-col items-center justify-center md:justify-start gap-6 md:gap-0 relative">
                    <div className="text-sm font-bold text-base-content/40 uppercase tracking-widest mb-0 md:mb-6 hidden md:block">
                      综合得分
                    </div>
                    <div className="relative">
                      <div
                        className={`radial-progress ${getScoreColor(result.overallScore ?? result.accuracyScore ?? 0)} bg-base-200 border-4 border-base-200 [--size:6.5rem] md:[--size:8rem] lg:[--size:10rem] [--thickness:0.6rem] md:[--thickness:0.8rem] lg:[--thickness:1rem]`}
                        style={
                          {
                            "--value":
                              result.overallScore ?? result.accuracyScore ?? 0,
                          } as React.CSSProperties
                        }
                        role="progressbar"
                      >
                        <span className="text-4xl md:text-4xl lg:text-5xl font-black text-base-content">
                          {Math.round(
                            result.overallScore ?? result.accuracyScore ?? 0,
                          )}
                        </span>
                      </div>
                      {(result.overallScore ?? result.accuracyScore ?? 0) >=
                        85 &&
                        !isNewBest && (
                          <div className="absolute -top-4 -right-4 text-4xl animate-bounce">
                            ✨
                          </div>
                        )}
                      {isNewBest && (
                        <div className="absolute -top-4 -right-12 bg-warning text-warning-content text-xs font-black px-2 py-1 rounded-full shadow-lg border-2 border-warning-content animate-bounce whitespace-nowrap">
                          👑 历史新高 +{Math.round(improvement)}分
                        </div>
                      )}
                      {isImprovement && (
                        <div className="absolute -top-3 -right-6 bg-success text-success-content text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse">
                          ↗ 进步了
                        </div>
                      )}
                    </div>
                    <div className="mt-0 md:mt-6 text-left md:text-center flex-1 md:flex-none">
                      <div className="text-xs font-bold text-base-content/40 uppercase tracking-widest mb-1 md:hidden">
                        综合得分
                      </div>
                      <div className="font-extrabold text-xl lg:text-2xl text-base-content">
                        {(result.overallScore ?? result.accuracyScore ?? 0) >=
                        passThreshold
                          ? "Excellent!"
                          : (result.overallScore ??
                                result.accuracyScore ??
                                0) >= 60
                            ? "Good Job!"
                            : "Keep Trying!"}
                      </div>
                      <div className="text-xs md:text-sm text-base-content/60 mt-1 md:mt-1.5 font-medium">
                        {(result.overallScore ?? result.accuracyScore ?? 0) >=
                        passThreshold
                          ? `已过关（≥${passThreshold}），发音很棒！`
                          : `继续练习，达到 ${passThreshold} 分即可过关`}
                      </div>
                    </div>
                  </div>

                  {/* 右侧：逐词反馈与维度 */}
                  <div className="lg:col-span-8 flex flex-col justify-center space-y-8">
                    {/* 逐词发音纠错 */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-bold text-base-content/40 uppercase tracking-widest">
                          逐词纠错详情
                        </div>
                        {result.userAudioUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleUserAudio();
                            }}
                            className={`btn btn-sm rounded-full border-none ${
                              isUserAudioPlaying
                                ? "bg-primary-600 text-white hover:bg-primary-700"
                                : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                            }`}
                          >
                            {isUserAudioPlaying ? (
                              <Pause size={14} fill="currentColor" />
                            ) : (
                              <Play size={14} fill="currentColor" />
                            )}
                            {isUserAudioPlaying ? "回放中" : "回放我的发音"}
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 text-base">
                        {result.words && result.words.length > 0 ? (
                          result.words.map((w, i) => (
                            <div key={i} className="relative">
                              {textMode === "blind" && isBlindMasked ? (
                                /* 盲读遮罩：与顶部遮罩样式一致 */
                                <span
                                  className="px-3 py-1.5 rounded-full border border-ink-200 dark:border-ink-600 inline-block select-none"
                                  style={{
                                    minWidth: `${Math.max(2, w.word.length) * 0.7}em`,
                                  }}
                                >
                                  <span className="block w-full h-[1.2em] rounded bg-ink-200 dark:bg-ink-700 blur-[2px]" />
                                </span>
                              ) : (
                                <WordScoreBadge
                                  word={w.word}
                                  score={w.score}
                                  onClick={() =>
                                    setActiveWordIndex(
                                      activeWordIndex === i ? null : i,
                                    )
                                  }
                                />
                              )}
                            </div>
                          ))
                        ) : (
                          <span className="text-base-content font-medium">
                            {result.speechText}
                          </span>
                        )}
                      </div>

                      {/* Inline Expand for Phonemes */}
                      {showIpa &&
                        activeWordIndex !== null &&
                        result.words &&
                        result.words[activeWordIndex] && (
                          <div className="mt-4 bg-base-200/50 rounded-xl border border-base-200 p-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
                              <div className="text-sm font-bold text-base-content/80 flex items-center flex-wrap">
                                单词{" "}
                                <span className="text-primary-600 px-1.5 mx-1 bg-primary-600/10 dark:bg-primary-400/10 rounded">
                                  {result.words[activeWordIndex].word}
                                </span>{" "}
                                的音素诊断：
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const w = result.words![activeWordIndex];
                                    playDictAudio(w.word, 2);
                                  }}
                                  className="btn btn-sm bg-base-100 hover:bg-base-200 text-info-600 border border-base-300 shadow-sm"
                                >
                                  <Volume2 size={14} /> 美音
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const w = result.words![activeWordIndex];
                                    playDictAudio(w.word, 1);
                                  }}
                                  className="btn btn-sm bg-base-100 hover:bg-base-200 text-info-600 border border-base-300 shadow-sm"
                                >
                                  <Volume2 size={14} /> 英音
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const w = result.words![activeWordIndex];
                                    // 取该词在字幕中的词级时间戳（绝对全集秒），
                                    // 精确播放对应原声片段，不再用用户录音相对时间估算。
                                    // 按词形 + 出现次序匹配：同形词多次出现时
                                    // （如句中两个 "the"），依据评测词序定位到正确的那个。
                                    const cleaned = (s: string) =>
                                      s
                                        .replace(/[.,!?;:"'()[\]{}]/g, "")
                                        .toLowerCase();
                                    const targetWord = cleaned(w.word);
                                    const occurrence =
                                      result
                                        .words!.slice(0, activeWordIndex + 1)
                                        .filter(
                                          (x) => cleaned(x.word) === targetWord,
                                        ).length - 1;
                                    const matches = (
                                      subtitle.words ?? []
                                    ).filter(
                                      (sw) => cleaned(sw.word) === targetWord,
                                    );
                                    const refWord =
                                      matches[occurrence] ?? matches[0];
                                    const refStart = refWord
                                      ? refWord.start
                                      : subtitle.startSeconds + (w.start || 0);
                                    const refEnd = refWord
                                      ? refWord.end
                                      : subtitle.startSeconds +
                                        (w.end || (w.start || 0) + 0.5);
                                    playReferenceAudio(1.0, refStart, refEnd);
                                  }}
                                  className="btn btn-sm bg-base-100 hover:bg-base-200 text-primary-600 border border-base-300 shadow-sm"
                                >
                                  <BotMessageSquare size={14} /> 原声
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const w = result.words![activeWordIndex];
                                    toggleUserAudio(w.start, w.end);
                                  }}
                                  className="btn btn-sm bg-base-100 hover:bg-base-200 text-secondary-600 border border-base-300 shadow-sm"
                                >
                                  <Mic size={14} /> 我
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {result.words[activeWordIndex].phonemes &&
                              result.words[activeWordIndex].phonemes.length >
                                0 ? (
                                result.words[activeWordIndex].phonemes.map(
                                  (ph: any, pIndex: number) => {
                                    const phScore =
                                      ph.score ?? ph.pronunciation ?? 0;
                                    const phName = ph.phoneme ?? ph.phone ?? "";
                                    return (
                                      <div
                                        key={pIndex}
                                        className={`flex flex-col items-center justify-center min-w-[3rem] px-3 py-1.5 rounded-lg border ${
                                          phScore >= 80
                                            ? "bg-success/10 border-success/20 text-success-700"
                                            : "bg-error-500/10 dark:bg-error-400/10 border-error-500/30 dark:border-error-400/30 text-error-600 font-bold"
                                        }`}
                                      >
                                        <span className="text-base font-mono tracking-wider">
                                          /{phName}/
                                        </span>
                                        <span className="text-[10px] opacity-70">
                                          {Math.round(phScore)}
                                        </span>
                                      </div>
                                    );
                                  },
                                )
                              ) : (
                                <div className="text-sm text-base-content/50 py-2">
                                  无详尽音素数据
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      {showIpa &&
                        result.words &&
                        result.words.some((w) => w.score < 85) && (
                          <div className="mt-3 text-[11px] font-medium text-warning flex items-center gap-1.5 bg-warning/10 w-fit px-2 py-1 rounded">
                            <Info size={12} />{" "}
                            点击黄色或红色单词查看音素诊断并对比发音
                          </div>
                        )}
                    </div>

                    {/* 多维指标横向柱状图 */}
                    <div className="space-y-4 pt-4 border-t border-base-200/50 md:pt-0 md:border-t-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDetails(!showDetails);
                        }}
                        className="flex md:hidden items-center justify-between w-full text-sm font-bold text-base-content/60 hover:text-primary-600 transition-colors"
                      >
                        <span className="uppercase tracking-widest">
                          详细维度
                        </span>
                        {showDetails ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                      <div className="hidden md:block text-sm font-bold text-base-content/40 uppercase tracking-widest mb-2">
                        详细维度
                      </div>
                      <div
                        className={`space-y-4 animate-in slide-in-from-top-2 ${showDetails ? "block" : "hidden md:block"}`}
                      >
                        {[
                          {
                            label: "准确度",
                            value: result.accuracyScore || 0,
                            color:
                              "[&::-webkit-progress-value]:bg-primary-600 [&::-moz-progress-bar]:bg-primary-600",
                          },
                          {
                            label: "流利度",
                            value:
                              result.fluencyScore ?? result.accuracyScore ?? 0,
                            color:
                              "[&::-webkit-progress-value]:bg-info-600 [&::-moz-progress-bar]:bg-info-600",
                          },
                          {
                            label: "完整度",
                            value:
                              result.integrityScore ??
                              result.accuracyScore ??
                              0,
                            color:
                              "[&::-webkit-progress-value]:bg-accent-600 [&::-moz-progress-bar]:bg-accent-600",
                          },
                        ].map((metric, idx) => (
                          <div key={idx} className="flex items-center gap-4">
                            <div className="w-16 text-sm font-bold text-base-content/60 shrink-0">
                              {metric.label}
                            </div>
                            <div className="flex-1">
                              <progress
                                className={`progress ${metric.color} w-full h-3 bg-base-200`}
                                value={metric.value}
                                max="100"
                              ></progress>
                            </div>
                            <div className="w-10 text-right text-sm font-black text-base-content shrink-0">
                              {metric.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 底部操作区：默认仅右对齐「再试一次」；传入退出插槽（影子跟读评测页）时
                改为两端布局 —— 再试一次居左，返回滑动卡片复习居中，返回句子本居右。
                移动端（<sm）隐藏全部图标并精简文案，确保三按钮同行不溢出。 */}
            <div
              className={`flex flex-wrap gap-2 ${onExit ? "justify-between" : "justify-end"} mt-8 pt-6 border-t border-base-200`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartRecording();
                }}
                className="btn px-3 sm:px-4 bg-transparent border border-ink-200 text-ink-600 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-600 transition-colors rounded-xl"
              >
                <RotateCcw size={18} className="hidden sm:block" />
                再试一次
              </button>
              {onBackToDeck && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBackToDeck();
                  }}
                  className="btn px-3 sm:px-4 bg-transparent border border-ink-200 text-ink-600 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-600 transition-colors rounded-xl"
                  title="返回滑动卡片复习"
                >
                  <Layers size={18} className="hidden sm:block" />
                  <span className="hidden sm:inline">返回滑动卡片复习</span>
                  <span className="sm:hidden">返回卡片</span>
                </button>
              )}
              {onExit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExit();
                  }}
                  className="btn px-3 sm:px-4 bg-transparent border border-ink-200 text-ink-600 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-600 transition-colors rounded-xl"
                  title="返回句子本"
                  aria-label="返回句子本"
                >
                  <ArrowLeft size={18} className="hidden sm:block" />
                  返回句子本
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 点词查询词典弹框 — 必须在 overflow-hidden 容器外部渲染，否则移动端全屏弹框会被裁剪 */}
      <VocabularyModal
        isModalOpen={isDictModalOpen}
        setIsModalOpen={setIsDictModalOpen}
        selectedWord={selectedWord}
        dictData={dictData}
        isLoadingDefinition={isLoadingDefinition}
        isSaving={isSaving}
        isSaved={globalVocabWords.has(selectedWord.toLowerCase())}
        episodeTitle={episodeTitle}
        onSave={handleSaveVocabulary}
      />

      {/* 收藏成功后的快捷标签抽屉（toast「添加标签/笔记」action 打开） */}
      <QuickTagDrawer
        sentence={tagDrawerSentence}
        onClose={() => setTagDrawerSentence(null)}
        onUpdated={() => {}}
      />
    </>
  );
};

export default SpeechEvaluationCard;
