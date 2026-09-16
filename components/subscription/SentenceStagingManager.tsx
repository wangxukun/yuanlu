"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Bookmark, Crown, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useUIStore } from "@/store/ui-store";
import { FREE_SENTENCE_LIMIT } from "@/lib/quota";
import {
  getStagedSentences,
  removeStagedSentence,
  stagedSentenceKey,
  isStagingExpiringSoon,
  type StagedSentence,
} from "@/lib/client/sentence-staging";
import {
  getSavedSentences,
  toggleSentenceSave,
  deleteSavedSentence,
  type SentenceActionResponse,
} from "@/lib/actions/sentences-actions";
import type { SavedSentenceItem } from "@/core/sentences/dto";

/**
 * [P3-a] 句子配额触墙承接（全局挂载于 ModalProvider，主报告 4.3 剧本 1）：
 *
 * 1. 非阻断浮卡：句子入暂存 1 秒后底部浮出（不打断音频）——
 *    "这句先帮你记下了 · 句子本 N/N 已满" + 容量条 +
 *    「腾个位置」（最旧 6 条删一进一）/「无限收藏」（PremiumModal）；
 * 2. 暂存区管理：条目列表、取消暂存、23 天起"即将过期"提示；
 * 3. 自动补提交：升级 PRO（P1-2 会话刷新后 role 变化）或腾出容量后，
 *    按暂存先后顺序自动 toggle 入库（跳过已收藏项，防止误删）。
 */

/** 把暂存句批量补提交入库；返回成功入库条数 */
async function flushStagedSentences(premium: boolean): Promise<number> {
  const staged = getStagedSentences();
  if (staged.length === 0) return 0;

  const res: SentenceActionResponse<SavedSentenceItem[]> =
    await getSavedSentences({});
  if (!res.success || !Array.isArray(res.data)) return 0;

  const existingKeys = new Set(res.data.map((s) => stagedSentenceKey(s)));
  let capacity = premium
    ? Number.POSITIVE_INFINITY
    : Math.max(0, FREE_SENTENCE_LIMIT - res.data.length);

  let flushed = 0;
  for (const s of staged) {
    const key = stagedSentenceKey(s);
    // 已收藏的条目（升级前手动收藏过）直接移出暂存——
    // toggle 对已存在句会执行删除，绝不能盲目调用
    if (existingKeys.has(key)) {
      removeStagedSentence(s);
      continue;
    }
    if (capacity <= 0) break;
    const r = await toggleSentenceSave({
      episodeid: s.episodeid,
      subtitleId: s.subtitleId,
      startTime: s.startTime,
      endTime: s.endTime,
      enText: s.enText,
      zhText: s.zhText ?? null,
    });
    if (r.success && r.data?.saved) {
      capacity -= 1;
      flushed += 1;
      removeStagedSentence(s);
    }
  }
  return flushed;
}

function isPremiumRole(role?: string | null): boolean {
  return role === "PREMIUM" || role === "ADMIN";
}

export default function SentenceStagingManager() {
  const { data: session } = useSession();
  const quotaCard = useUIStore((s) => s.sentenceQuotaCard);
  const closeCard = useUIStore((s) => s.closeSentenceQuotaCard);
  const openPremiumModal = useUIStore((s) => s.openPremiumModal);

  // 浮卡 1 秒延迟出现（非阻断，不打断用户当前动作）
  const [visible, setVisible] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [oldestSaved, setOldestSaved] = useState<SavedSentenceItem[]>([]);
  const [loadingOldest, setLoadingOldest] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [stagedList, setStagedList] = useState<StagedSentence[]>([]);
  const [flushing, setFlushing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (quotaCard) {
      setStagedList(getStagedSentences());
      timerRef.current = setTimeout(() => setVisible(true), 1000);
    } else {
      setVisible(false);
      setSelectorOpen(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [quotaCard]);

  // 升级 PRO（或 ADMIN 登录）后自动补提交：role 经 P1-2 派生，
  // 订阅激活 → updateSession 强刷 → session.role 变化 → 触发 flush
  const prevPremiumRef = useRef<boolean | null>(null);
  useEffect(() => {
    const premium = isPremiumRole(session?.user?.role);
    const prev = prevPremiumRef.current;
    prevPremiumRef.current = premium;
    if (prev === null) return; // 首次加载不触发
    if (!prev && premium && getStagedSentences().length > 0) {
      setFlushing(true);
      flushStagedSentences(true)
        .then((n) => {
          if (n > 0) {
            toast.success(`欢迎加入 PRO！已自动为你收藏 ${n} 句暂存句子`);
            closeCard();
          }
        })
        .finally(() => setFlushing(false));
    }
  }, [session?.user?.role, closeCard]);

  // 「腾个位置」：取最旧 6 条已收藏句子供选择删除（删一进一）
  const openSelector = useCallback(async () => {
    setSelectorOpen(true);
    setLoadingOldest(true);
    try {
      const res = await getSavedSentences({});
      if (res.success && Array.isArray(res.data)) {
        const items = [...res.data].sort(
          (a, b) =>
            new Date(a.createAt).getTime() - new Date(b.createAt).getTime(),
        );
        setOldestSaved(items.slice(0, 6));
      }
    } finally {
      setLoadingOldest(false);
    }
  }, []);

  const handleDeleteOldest = useCallback(
    async (item: SavedSentenceItem) => {
      setDeletingId(item.id);
      try {
        const res = await deleteSavedSentence(item.id);
        if (!res.success) {
          toast.error(res.message || "删除失败");
          return;
        }
        toast.success("已腾出 1 个位置");
        // 容量释放后自动补提交暂存句（仍非会员时按剩余容量收）
        setFlushing(true);
        const flushed = await flushStagedSentences(
          isPremiumRole(session?.user?.role),
        );
        if (flushed > 0) {
          toast.success(`已自动收藏 ${flushed} 句暂存句子`);
        }
        // 刷新选择器与浮卡数据
        setStagedList(getStagedSentences());
        if (flushed === 0 || getStagedSentences().length > 0) {
          await openSelector();
        } else {
          setSelectorOpen(false);
          closeCard();
        }
      } finally {
        setDeletingId(null);
      }
    },
    [session?.user?.role, openSelector, closeCard],
  );

  const handleUnstage = useCallback((s: StagedSentence) => {
    removeStagedSentence(s);
    setStagedList(getStagedSentences());
  }, []);

  if (!quotaCard) return null;

  const { totalCount, limit } = quotaCard;
  const pct = Math.min(100, Math.round((totalCount / limit) * 100));

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998] w-[92vw] max-w-md transition-all duration-500 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      role="status"
      aria-label="句子本已满提示"
    >
      <div className="bg-base-100 border border-base-200 rounded-2xl shadow-e3 p-5">
        {/* 头部 */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-primary-600/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <Bookmark size={18} className="fill-primary-600/20" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-base-content">
              这句先帮你记下了
            </p>
            <p className="text-xs text-base-content/60 font-semibold mt-0.5">
              句子本 {totalCount}/{limit} 已满 · 暂存 {stagedList.length}{" "}
              句，升级后自动入库
            </p>
          </div>
          <button
            onClick={closeCard}
            className="p-1.5 rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-200 transition-colors"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        {/* 容量条 */}
        <div className="mt-3 h-2 rounded-full bg-base-200 overflow-hidden">
          <div
            className="h-full bg-primary-600 dark:bg-primary-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* 主行动 */}
        {!selectorOpen ? (
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => void openSelector()}
              className="flex-1 btn btn-sm h-10 rounded-xl bg-base-200 hover:bg-base-300 border-none text-base-content font-bold"
            >
              腾个位置
            </button>
            <button
              onClick={() => {
                closeCard();
                openPremiumModal("sentence_quota");
              }}
              className="flex-1 btn btn-sm h-10 rounded-xl bg-primary-600 hover:bg-primary-700 border-none text-white font-bold gap-1"
            >
              <Crown size={14} /> 无限收藏
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-xs font-bold text-base-content/70 mb-2">
              删除一条旧句子，为新句子腾出位置：
            </p>
            {loadingOldest ? (
              <div className="flex items-center justify-center py-4 text-base-content/50">
                <Loader2 size={16} className="animate-spin mr-2" /> 加载中…
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {oldestSaved.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-base-200/60"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-base-content truncate">
                        {item.enText}
                      </p>
                      <p className="text-[10px] text-base-content/40">
                        {item.episodeTitle} ·{" "}
                        {new Date(item.createAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                    <button
                      onClick={() => void handleDeleteOldest(item)}
                      disabled={deletingId === item.id}
                      className="btn btn-ghost btn-xs text-error hover:bg-error/10 shrink-0"
                    >
                      {deletingId === item.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        "删除"
                      )}
                    </button>
                  </div>
                ))}
                {oldestSaved.length === 0 && (
                  <p className="text-xs text-base-content/50 text-center py-2">
                    暂无可删除的句子
                  </p>
                )}
              </div>
            )}
            <button
              onClick={() => setSelectorOpen(false)}
              className="btn btn-ghost btn-xs mt-2 w-full text-base-content/50"
            >
              收起
            </button>
          </div>
        )}

        {/* 暂存句子列表（取消暂存 / 即将过期提示） */}
        {stagedList.length > 0 && (
          <div className="mt-3 pt-3 border-t border-base-200">
            <p className="text-[10px] font-bold text-base-content/40 mb-1.5 flex items-center gap-1">
              <Sparkles size={10} /> 已暂存（30 天内升级或腾位自动入库）
            </p>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {stagedList.map((s) => {
                const key = stagedSentenceKey(s);
                const expiring = isStagingExpiringSoon(s);
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 text-[11px] text-base-content/60"
                  >
                    <span className="flex-1 truncate">
                      {s.enText}
                      {expiring && (
                        <span className="ml-1 text-warning-600 font-bold">
                          · 即将过期
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => handleUnstage(s)}
                      className="text-base-content/30 hover:text-error transition-colors shrink-0"
                      title="取消暂存"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {flushing && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-primary-600 font-bold">
            <Loader2 size={12} className="animate-spin" /> 正在自动收藏暂存句子…
          </div>
        )}
      </div>
    </div>
  );
}
