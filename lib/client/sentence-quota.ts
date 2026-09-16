import { toast } from "sonner";
import { useUIStore } from "@/store/ui-store";
import { SENTENCE_QUOTA_EXCEEDED } from "@/lib/quota";
import {
  stageSentence,
  SENTENCE_STAGING_LIMIT,
} from "@/lib/client/sentence-staging";

/**
 * [P3-a] 句子收藏触墙统一承接（模板对齐 lib/client/vocabulary-quota.ts，
 * 但按主报告 4.3 剧本 1 走"暂存 + 浮卡"而非普通弹窗）：
 *
 * 1. 判定 code === SENTENCE_QUOTA_EXCEEDED（REST 403 响应或 action 失败响应）；
 * 2. 句子写入本集暂存区（书签"半亮 PRO 徽记态"由调用方渲染）；
 * 3. 打开非阻断浮卡（容量条 + 「腾个位置」/「无限收藏」），不打断音频；
 * 4. 埋点：QUOTA_BLOCKED/sentence_total 由服务端在拦截时记录，
 *    「无限收藏」点击时 openPremiumModal 内置 PREMIUM_MODAL_OPEN(sentence_quota)。
 */

export interface SentenceQuotaContext {
  episodeid: string;
  subtitleId?: number | null;
  startTime: number;
  endTime: number;
  enText: string;
  zhText?: string | null;
}

/** 判断响应是否为句子配额触墙（REST 403 body 或 Server Action 返回值） */
export function isSentenceQuotaBlocked(res: {
  code?: string;
  error?: string;
  success?: boolean;
}): boolean {
  return (
    res.code === SENTENCE_QUOTA_EXCEEDED ||
    res.error === SENTENCE_QUOTA_EXCEEDED
  );
}

/**
 * 触墙承接入口：暂存句子 + 打开浮卡。
 * 调用方在乐观更新回落后按 isSentenceStaged 渲染半亮态（书签不死）。
 */
export function handleSentenceQuotaBlock(
  sentence: SentenceQuotaContext,
  quota: { totalCount: number; limit: number },
  opts: { onStaged?: () => void } = {},
): void {
  const staged = stageSentence({
    episodeid: sentence.episodeid,
    subtitleId: sentence.subtitleId ?? null,
    startTime: sentence.startTime,
    endTime: sentence.endTime,
    enText: sentence.enText,
    zhText: sentence.zhText ?? null,
  });

  if (!staged.ok && staged.reason === "LIMIT_REACHED") {
    toast.error(
      `暂存区已满（${SENTENCE_STAGING_LIMIT} 条）。请先清理暂存句子，或升级 PRO 无限收藏`,
    );
    // 暂存满了仍打开浮卡——它的「腾个位置」同样管理暂存
  } else if (!staged.ok && staged.reason === "DUPLICATE") {
    // 重复点击同一句：不重复入暂存，也不打扰
    return;
  }

  useUIStore.getState().openSentenceQuotaCard(quota.totalCount, quota.limit);
  opts.onStaged?.();
}
