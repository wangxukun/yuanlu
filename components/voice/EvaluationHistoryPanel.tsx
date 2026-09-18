"use client";

/**
 * [P3-g] 跟读历史面板：进步曲线 + 历史列表 + 录音回放（ImmersiveSpeechPractice 内挂载）。
 *
 * 分层（商业化新墙三）：
 * - 免费层：最近 5 条评测记录（分数/日期/句子）+ 5 点迷你进步曲线；
 *   录音回放与词级评测细节锁定——点击锁定钮弹 PremiumModal（source
 *   history_playback，openPremiumModal 内置 PREMIUM_MODAL_OPEN 埋点，验收红线）。
 * - PRO 层：全量历史 + 录音回放（practice-data 服务端签发的短时签名 URL，
 *   直链不落 payload）+ 词级评测细节（/api/speech/detail 按会员门禁）+ 前后对比。
 *
 * 注意：免费用户在本面板内一律不出现回放入口（含会话内新评测的本地 blob
 * 回放）——"录音回放"整体是 PRO 权益；评测卡上的即时"回放我的发音"
 * （刚录完的本地音频）不属于历史回放，保持免费。
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChevronDown,
  History,
  Loader2,
  Lock,
  Pause,
  Play,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { SpeechPracticeRecord } from "@/lib/types";
import { useUIStore } from "@/store/ui-store";
import WordScoreBadge from "@/components/voice/WordScoreBadge";

interface EvaluationHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  /** practice-data 下发的可见记录（免费=最近 5 条 / PRO=全量），组件内自行排序 */
  records: SpeechPracticeRecord[];
  isPremium: boolean;
  /** 服务端切片前的历史总数（加载时点） */
  historyTotal: number;
  /** 免费用户被切片隐藏的更早记录数（0 = 无锁定层） */
  hiddenCount: number;
}

interface DetailWord {
  word: string;
  score: number;
}

const recordScore = (r: SpeechPracticeRecord) =>
  r.overallScore ?? r.accuracyScore ?? 0;

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const getScoreTextClass = (score: number) => {
  if (score >= 85) return "text-primary-600 dark:text-primary-400";
  if (score >= 60) return "text-accent-600 dark:text-accent-400";
  return "text-error-600 dark:text-error-400";
};

export default function EvaluationHistoryPanel({
  open,
  onClose,
  records,
  isPremium,
  historyTotal,
  hiddenCount,
}: EvaluationHistoryPanelProps) {
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // 词级评测细节展开态：recognitionid -> { loading, words }
  const [detailStates, setDetailStates] = useState<
    Map<number, { loading: boolean; words: DetailWord[] | null }>
  >(new Map());

  // 时间正序（曲线从左到右 = 从旧到新）
  const sortedAsc = useMemo(
    () =>
      [...records].sort(
        (a, b) =>
          new Date(a.recognitionDate).getTime() -
          new Date(b.recognitionDate).getTime(),
      ),
    [records],
  );
  const latestFirst = useMemo(() => [...sortedAsc].reverse(), [sortedAsc]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
  }, []);

  // 关闭面板 / 卸载时停掉回放
  useEffect(() => {
    if (!open) stopAudio();
  }, [open, stopAudio]);
  useEffect(() => stopAudio, [stopAudio]);

  const openHistoryModal = useCallback(() => {
    useUIStore.getState().openPremiumModal("history_playback", { hiddenCount });
  }, [hiddenCount]);

  const togglePlay = useCallback(
    (record: SpeechPracticeRecord) => {
      if (!isPremium) {
        openHistoryModal();
        return;
      }
      if (!record.userAudioUrl) {
        toast.info("这条记录没有可回放的录音");
        return;
      }
      if (playingId === record.recognitionid) {
        stopAudio();
        return;
      }
      stopAudio();
      const audio = new Audio(record.userAudioUrl);
      audioRef.current = audio;
      setPlayingId(record.recognitionid);
      audio.onended = () => {
        audioRef.current = null;
        setPlayingId(null);
      };
      audio.onerror = () => {
        audioRef.current = null;
        setPlayingId(null);
        toast.error("回放失败，请重试");
      };
      audio.play().catch(() => {
        audioRef.current = null;
        setPlayingId(null);
        toast.error("回放失败，请重试");
      });
    },
    [isPremium, playingId, stopAudio, openHistoryModal],
  );

  // PRO：按需拉取词级评测细节（/api/speech/detail 已按会员门禁）
  const loadDetail = useCallback(
    async (record: SpeechPracticeRecord) => {
      const existing = detailStates.get(record.recognitionid);
      if (existing?.words) return; // 已加载，切换折叠交给 UI
      setDetailStates((prev) =>
        new Map(prev).set(record.recognitionid, {
          loading: true,
          words: null,
        }),
      );
      try {
        const res = await fetch(
          `/api/speech/detail?id=${record.recognitionid}`,
        );
        const json = await res.json();
        const words: DetailWord[] | null =
          json?.success && Array.isArray(json.data?.words)
            ? json.data.words.map(
                (w: { word: string; pronunciation: number }) => ({
                  word: w.word,
                  score: w.pronunciation,
                }),
              )
            : null;
        setDetailStates((prev) =>
          new Map(prev).set(record.recognitionid, {
            loading: false,
            words,
          }),
        );
      } catch {
        setDetailStates((prev) =>
          new Map(prev).set(record.recognitionid, {
            loading: false,
            words: null,
          }),
        );
        toast.error("评测细节加载失败");
      }
    },
    [detailStates],
  );

  const [expandedId, setExpandedId] = useState<number | null>(null);

  // ── 曲线数据（可见记录的真实得分，免费 5 点 / PRO 全量）──
  const curveData = useMemo(
    () =>
      sortedAsc.map((r, i) => ({
        label: formatDateTime(r.recognitionDate) || `#${i + 1}`,
        score: recordScore(r),
      })),
    [sortedAsc],
  );

  // ── PRO 前后对比：首次 vs 近期（各取前/后最多 3 条均分）──
  const comparison = useMemo(() => {
    if (!isPremium || sortedAsc.length < 2) return null;
    const edge = 3;
    const firstN = sortedAsc.slice(0, edge);
    const lastN = sortedAsc.slice(-edge);
    const avg = (arr: SpeechPracticeRecord[]) =>
      Math.round(
        arr.reduce((sum, r) => sum + recordScore(r), 0) /
          Math.max(1, arr.length),
      );
    return {
      firstAvg: avg(firstN),
      latestAvg: avg(lastN),
      delta: avg(lastN) - avg(firstN),
    };
  }, [isPremium, sortedAsc]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[210] bg-black/30 backdrop-blur-[2px] flex justify-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-full sm:max-w-md h-full bg-white dark:bg-ink-900 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="跟读历史与进步曲线"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-ink-100 dark:border-ink-800 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <History size={18} className="text-primary-600 shrink-0" />
                <span className="text-sm font-bold text-ink-900 dark:text-ink-100 truncate">
                  跟读历史 · 本集
                </span>
                <span className="text-xs text-ink-400 shrink-0">
                  共 {historyTotal} 条
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-xl text-ink-500 hover:text-ink-800 dark:hover:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
                aria-label="关闭历史面板"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5 space-y-6">
              {latestFirst.length === 0 ? (
                <div className="text-center py-16 text-sm text-ink-400">
                  本集还没有跟读记录
                  <p className="text-xs mt-2 text-ink-300 dark:text-ink-500">
                    完成第一次跟读评测后，这里会出现你的进步曲线
                  </p>
                </div>
              ) : (
                <>
                  {/* 进步曲线 */}
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-ink-400 dark:text-ink-500 uppercase tracking-widest">
                        进步曲线
                      </h3>
                      {isPremium && comparison && (
                        <span
                          className={`text-xs font-bold ${comparison.delta > 0 ? "text-success-600" : "text-ink-400"}`}
                        >
                          {comparison.delta > 0
                            ? `首次均分 ${comparison.firstAvg} → 近期 ${comparison.latestAvg} · 进步 ${comparison.delta} 分`
                            : `近期均分 ${comparison.latestAvg} · 继续保持`}
                        </span>
                      )}
                    </div>
                    <div className="h-44 rounded-2xl border border-ink-100 dark:border-ink-800 bg-ink-50/50 dark:bg-ink-950/40 p-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={curveData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="currentColor"
                            opacity={0.1}
                          />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 10 }}
                            width={24}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: "none",
                              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                              fontSize: 12,
                            }}
                            formatter={(value: number) => [
                              `${value} 分`,
                              "综合分",
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke="#4f46e5"
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {!isPremium && hiddenCount > 0 && (
                      <p className="text-[11px] text-ink-400 mt-2 flex items-center gap-1">
                        <TrendingUp size={12} />
                        曲线仅含最近 {records.length} 条 · PRO
                        解锁全量曲线与前后对比
                      </p>
                    )}
                  </section>

                  {/* 历史列表（最新在前） */}
                  <section>
                    <h3 className="text-xs font-bold text-ink-400 dark:text-ink-500 uppercase tracking-widest mb-3">
                      评测记录
                    </h3>
                    <div className="space-y-2.5">
                      {latestFirst.map((record) => {
                        const detail = detailStates.get(record.recognitionid);
                        const isExpanded = expandedId === record.recognitionid;
                        const isPlaying = playingId === record.recognitionid;
                        return (
                          <div
                            key={record.recognitionid}
                            className="rounded-2xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 px-4 py-3"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col items-center shrink-0 w-10">
                                <span
                                  className={`text-lg font-black leading-none ${getScoreTextClass(recordScore(record))}`}
                                >
                                  {Math.round(recordScore(record))}
                                </span>
                                <span className="text-[10px] text-ink-400 mt-0.5">
                                  {formatDateTime(record.recognitionDate)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-ink-700 dark:text-ink-300 line-clamp-1 leading-relaxed">
                                  {record.targetText}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  {/* 回放：PRO 播签名 URL / 免费锁定承接 */}
                                  <button
                                    onClick={() => togglePlay(record)}
                                    className={`btn btn-xs rounded-full border-none h-7 min-h-0 px-3 ${
                                      isPlaying
                                        ? "bg-primary-600 hover:bg-primary-700 text-white"
                                        : !isPremium
                                          ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20"
                                          : record.userAudioUrl
                                            ? "bg-ink-100 hover:bg-ink-200 dark:bg-ink-800 dark:hover:bg-ink-700 text-ink-700 dark:text-ink-200"
                                            : "bg-ink-50 dark:bg-ink-800/50 text-ink-400 cursor-not-allowed"
                                    }`}
                                    aria-label={
                                      isPlaying ? "停止回放" : "回放这条录音"
                                    }
                                  >
                                    {isPlaying ? (
                                      <>
                                        <Pause size={12} fill="currentColor" />
                                        回放中
                                      </>
                                    ) : isPremium ? (
                                      <>
                                        <Play size={12} fill="currentColor" />
                                        回放
                                      </>
                                    ) : (
                                      <>
                                        <Lock size={12} />
                                        回放
                                      </>
                                    )}
                                  </button>
                                  {/* 词级细节：仅 PRO 且服务端带回了 detailUrl */}
                                  {isPremium && record.detailUrl && (
                                    <button
                                      onClick={() => {
                                        if (isExpanded) {
                                          setExpandedId(null);
                                        } else {
                                          setExpandedId(record.recognitionid);
                                          void loadDetail(record);
                                        }
                                      }}
                                      className="btn btn-xs rounded-full border-none h-7 min-h-0 px-3 bg-ink-100 hover:bg-ink-200 dark:bg-ink-800 dark:hover:bg-ink-700 text-ink-700 dark:text-ink-200"
                                      aria-label="展开词级评测细节"
                                    >
                                      <ChevronDown
                                        size={12}
                                        className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                      />
                                      细节
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* 词级细节展开区（PRO） */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-ink-100 dark:border-ink-800">
                                {detail?.loading ? (
                                  <div className="flex justify-center py-3">
                                    <Loader2
                                      size={16}
                                      className="animate-spin text-ink-400"
                                    />
                                  </div>
                                ) : detail?.words && detail.words.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {detail.words.map((w, i) => (
                                      <WordScoreBadge
                                        key={i}
                                        word={w.word}
                                        score={w.score}
                                        className="!px-2.5 !py-1 !text-sm"
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-ink-400 py-2 text-center">
                                    这条记录没有词级评测细节
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* 免费锁定层：更早的历史被切片隐藏 */}
                      {!isPremium && hiddenCount > 0 && (
                        <button
                          type="button"
                          onClick={openHistoryModal}
                          className="w-full rounded-2xl border border-dashed border-amber-400/60 dark:border-amber-500/40 bg-amber-50/60 dark:bg-amber-500/5 hover:bg-amber-50 dark:hover:bg-amber-500/10 px-4 py-3.5 flex items-center gap-3 transition-colors cursor-pointer"
                        >
                          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                            <Lock size={16} />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-bold text-base-content">
                              还有 {hiddenCount} 条更早的跟读历史已锁定
                            </p>
                            <p className="text-[11px] text-base-content/60 mt-0.5">
                              PRO 解锁：全量历史 + 录音回放 + 进步曲线与前后对比
                            </p>
                          </div>
                          <span className="btn btn-xs rounded-full border-0 bg-amber-500 hover:bg-amber-600 text-white shrink-0 h-7 min-h-0 px-3">
                            解锁历史回放
                          </span>
                        </button>
                      )}
                    </div>
                  </section>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
