import { toast } from "sonner";
import { useUIStore } from "@/store/ui-store";
import {
  VOCABULARY_QUOTA_EXCEEDED,
  VOCABULARY_DAILY_QUOTA_EXCEEDED,
} from "@/lib/quota";

/**
 * 生词保存配额拦截的统一前端处理（P1-1，模板复刻 lib/client/dictionary-quota.ts）：
 * 展示提示并按拦截维度打开会员升级弹窗 + 上报 PREMIUM_MODAL_OPEN 埋点。
 * 传入 /api/vocabulary/add 的响应体，返回 true 表示是配额拦截且已处理，
 * 调用方应终止后续流程（不要再叠加普通错误 toast）。
 *
 * source 口径与服务端 QUOTA_BLOCKED 埋点一致（vocabulary_total / vocabulary_daily），
 * 管理端漏斗可按同一 source 串联"触墙 → 弹窗 → 订阅"。
 */
export function handleVocabularyQuotaBlock(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const { code, message } = body as { code?: string; message?: string };

  if (code === VOCABULARY_QUOTA_EXCEEDED) {
    toast.error(message || "生词本已满，删除旧词可腾出空间");
    useUIStore.getState().openPremiumModal("vocabulary_total");
    return true;
  }

  if (code === VOCABULARY_DAILY_QUOTA_EXCEEDED) {
    toast.error(message || "今日免费生词收藏次数已用完");
    useUIStore.getState().openPremiumModal("vocabulary_daily");
    return true;
  }

  return false;
}
