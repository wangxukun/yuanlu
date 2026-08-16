import prisma from "@/lib/prisma";

/**
 * 转化事件埋点（服务端）。
 *
 * 事件类型：
 * - PREMIUM_MODAL_OPEN  会员弹窗被打开，source 标注触发来源
 * - QUOTA_BLOCKED       免费配额用尽被拦截（生词/语音评测）
 * - TRIAL_REACHED       语音练习试用触墙（内容被截断且用户首次在本集练习）
 *
 * 记录失败只打日志、绝不抛错，埋点不能影响主业务流程。
 */

export const CONVERSION_EVENT_TYPES = [
  "PREMIUM_MODAL_OPEN",
  "QUOTA_BLOCKED",
  "TRIAL_REACHED",
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
