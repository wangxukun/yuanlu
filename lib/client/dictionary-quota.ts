import { toast } from "sonner";
import { useUIStore } from "@/store/ui-store";
import { DICTIONARY_QUOTA_EXCEEDED } from "@/lib/quota";

/**
 * 词典查询配额拦截的统一前端处理：展示提示并打开会员升级弹窗。
 * 传入接口响应体，返回 true 表示是配额拦截且已处理，调用方应终止后续流程。
 */
export function handleDictionaryQuotaBlock(body: unknown): boolean {
  if (
    body &&
    typeof body === "object" &&
    (body as { code?: string }).code === DICTIONARY_QUOTA_EXCEEDED
  ) {
    const message = (body as { message?: string }).message;
    toast.error(message || "今日免费词典查询次数已用完");
    useUIStore.getState().openPremiumModal("dictionary_quota");
    return true;
  }
  return false;
}
