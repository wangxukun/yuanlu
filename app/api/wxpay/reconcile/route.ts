import { NextRequest, NextResponse } from "next/server";
import { WxpayReconcileService } from "@/core/wxpay/reconcile.service";
import { shouldRunReconcile } from "@/core/wxpay/query.core";

/**
 * POST /api/wxpay/reconcile — 兜底查单触发入口（模块 E T4.5）
 *
 * 供外部 cron（或手动）调用：header x-reconcile-secret 须等于 env
 * WXPAY_RECONCILE_SECRET（未配置时显式 403——防裸奔）。5 分钟节流
 * （模块级 lastRunAt；定时幂等由 PENDING 过滤 + 幂等闸门双保险）。
 */
let lastRunAt: number | null = null;

export async function POST(request: NextRequest) {
  const expected = process.env.WXPAY_RECONCILE_SECRET;
  if (!expected) {
    return NextResponse.json(
      { success: false, error: "未配置 WXPAY_RECONCILE_SECRET，拒绝触发" },
      { status: 403 },
    );
  }
  if (request.headers.get("x-reconcile-secret") !== expected) {
    return NextResponse.json(
      { success: false, error: "触发凭据错误" },
      { status: 403 },
    );
  }

  if (!shouldRunReconcile(lastRunAt, Date.now())) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "throttled",
    });
  }
  lastRunAt = Date.now();

  try {
    const summary = await WxpayReconcileService.runReconcile();
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    lastRunAt = null; // 失败不占节流窗口，下轮可重试
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "reconcile 失败",
      },
      { status: 500 },
    );
  }
}
