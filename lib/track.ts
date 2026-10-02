import prisma from "@/lib/prisma";

/**
 * 转化事件埋点（服务端）。
 *
 * 事件类型：
 * - PREMIUM_MODAL_OPEN  会员弹窗被打开，source 标注触发来源
 * - QUOTA_BLOCKED       免费配额用尽被拦截（生词/语音评测）
 * - TRIAL_REACHED       语音练习试用触墙（内容被截断且用户首次在本集练习）
 * - SUBSCRIPTION_RECOVERED  无法自动匹配的付款经认领找回并激活
 *   （source: admin_claim 管理员认领 / self_service 用户自助找回）
 * - TRANSCRIPT_PDF_DOWNLOAD  文稿 PDF 下载漏斗（小程序会员链路，T2.2）
 *   （source: start 发起 / success 成功 / fail_* 各失败分支）
 * - SUBSCRIBE_PAGE_VIEW  订阅页到达（小程序订阅漏斗首事件，SUBSCRIBE-TASK T5.3；
 *   source=归因场景，缺省 unknown，与 PREMIUM_MODAL_OPEN 口径一致）
 * - ORDER_CREATE  虚拟支付订单落库（漏斗中段，source=planKey，
 *   metadata={outTradeNo, buyQuantity}；支付取消/失败不回退，金额可凭
 *   outTradeNo 关联 wxpay_orders）
 * - PAY_SUCCESS  支付转化（漏斗末段，source=planKey，metadata 同上；
 *   小程序端以后端发货轮询收敛为准上报——requestVirtualPayment 的 success
 *   回调不可信，不作依据）
 *
 * 记录失败只打日志、绝不抛错，埋点不能影响主业务流程。
 */

export const CONVERSION_EVENT_TYPES = [
  "PREMIUM_MODAL_OPEN",
  "QUOTA_BLOCKED",
  "TRIAL_REACHED",
  "SUBSCRIPTION_RECOVERED",
  "TRANSCRIPT_PDF_DOWNLOAD",
  "SUBSCRIBE_PAGE_VIEW",
  "ORDER_CREATE",
  "PAY_SUCCESS",
] as const;

export type ConversionEventType = (typeof CONVERSION_EVENT_TYPES)[number];

export async function recordConversionEvent(params: {
  eventType: ConversionEventType;
  source?: string;
  userid?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.conversion_events.create({
      data: {
        eventType: params.eventType,
        source: params.source ?? null,
        userid: params.userid ?? null,
        metadata: (params.metadata ?? undefined) as never,
      },
    });
  } catch (error) {
    console.error("[track] Failed to record conversion event:", error);
  }
}
