import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  recordConversionEvent,
  CONVERSION_EVENT_TYPES,
  ConversionEventType,
} from "@/lib/track";

/**
 * POST /api/track
 * 客户端转化事件上报（目前用于会员弹窗打开 PREMIUM_MODAL_OPEN）。
 * 未登录用户也允许上报（弹窗可能在登录前触发），userid 记为空。
 * 事件类型白名单校验，防止任意数据写入。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventType, source, metadata } = body || {};

    if (!eventType || !CONVERSION_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 },
      );
    }

    const session = await auth();

    await recordConversionEvent({
      eventType: eventType as ConversionEventType,
      source: typeof source === "string" ? source.slice(0, 100) : undefined,
      userid: session?.user?.userid ?? null,
      metadata: metadata && typeof metadata === "object" ? metadata : undefined,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[POST /api/track]", error);
    // 上报接口对客户端永远返回成功，避免影响 UI
    return new NextResponse(null, { status: 204 });
  }
}
