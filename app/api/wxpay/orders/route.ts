import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/core/auth/guard";
import { toUserOrderDto, USER_ORDER_TAKE } from "@/core/wxpay/orders.core";

/**
 * GET /api/wxpay/orders — 当前用户虚拟支付订单列表（订单中心页数据源）
 *
 * 微信《小程序订单中心设置规范》配套接口：小程序订单中心页
 * （weapp pages/subscription/orders）展示「所有涉及资金交易的订单明细」。
 * requireAuth 过 → 按 userid 查 wxpay_orders（createAt 倒序，命中
 * [userid, createAt desc] 索引）→ toUserOrderDto 白名单裁剪（productId/
 * wxOrderId 等内部标识不下发）。无分页（take 100 上限，会员购买频次
 * 场景足够）；游客/未登录由 requireAuth 401 拦截，前端页面内引导登录。
 */
export async function GET() {
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }

  const orders = await prisma.wxpayOrder.findMany({
    where: { userid: guard.session.user.userid! },
    orderBy: { createAt: "desc" },
    take: USER_ORDER_TAKE,
    select: {
      outTradeNo: true,
      planKey: true,
      buyQuantity: true,
      amountFen: true,
      daysGranted: true,
      status: true,
      createAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: { orders: orders.map(toUserOrderDto) },
  });
}
