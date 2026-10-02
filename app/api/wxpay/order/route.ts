import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { WxpayOrderService } from "@/core/wxpay/order.service";

/**
 * POST /api/wxpay/order — 虚拟支付下单（模块 E T4.3）
 *
 * Body: { planKey, buyQuantity }。requireAuth → 校验 → SKU 定价（金额分
 * 恒来自服务端 SKU 表，不收前端价）→ outTradeNo 生成 → wxpay_orders 落
 * PENDING → 返回 { signData, paySig, signature, outTradeNo } 供前端
 * wx.requestVirtualPayment 原样拉起（三件套零改写，逐字节一致红线）。
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuth();
    if (!guard.ok) {
      return guard.response;
    }

    const body = (await request.json()) as {
      planKey?: unknown;
      buyQuantity?: unknown;
    };

    const payload = await WxpayOrderService.createOrder(
      guard.session.user.userid!,
      {
        planKey: String(body.planKey ?? ""),
        buyQuantity: Number(body.buyQuantity),
      },
    );

    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "下单失败",
      },
      { status: 400 },
    );
  }
}
