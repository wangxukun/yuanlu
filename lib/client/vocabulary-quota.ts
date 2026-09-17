import { useUIStore } from "@/store/ui-store";
import {
  VOCABULARY_QUOTA_EXCEEDED,
  VOCABULARY_DAILY_QUOTA_EXCEEDED,
} from "@/lib/quota";

/**
 * 生词保存配额拦截的统一前端处理（P1-1，模板复刻 lib/client/dictionary-quota.ts）：
 * 按拦截维度打开会员升级弹窗（场景化文案承接拦截原因）+ 上报 PREMIUM_MODAL_OPEN 埋点。
 * 传入 /api/vocabulary/add 的响应体，返回 true 表示是配额拦截且已处理，
 * 调用方应终止后续流程（不要再叠加普通错误 toast）。
 *
 * 只弹 PremiumModal 不再叠 toast：弹窗文案已说明配额与解锁方式，
 * 双重提示冗余且遮挡视线（精听页触墙实测反馈）。
 *
 * source 口径与服务端 QUOTA_BLOCKED 埋点一致（vocabulary_total / vocabulary_daily），
 * 管理端漏斗可按同一 source 串联"触墙 → 弹窗 → 订阅"。
 */
export function handleVocabularyQuotaBlock(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const { code } = body as { code?: string };

  if (code === VOCABULARY_QUOTA_EXCEEDED) {
    useUIStore.getState().openPremiumModal("vocabulary_total");
    return true;
  }

  if (code === VOCABULARY_DAILY_QUOTA_EXCEEDED) {
    useUIStore.getState().openPremiumModal("vocabulary_daily");
    return true;
  }

  return false;
}
