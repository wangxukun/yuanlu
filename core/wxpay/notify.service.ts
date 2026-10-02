/**
 * core/wxpay/notify.service.ts — 发货/退款推送处理（模块 E T4.4）
 *
 * 发货（xpay_goods_deliver_notify）：
 *   1. 幂等：wxOrderId（MchOrderNo）唯一索引闸门——推送重试/重放在此
 *      拦截（对齐 afdian_orders out_trade_no 先例）；
 *   2. 对单：OutTradeNo 匹配 PENDING 订单；productId/份数/金额分三方
 *      对账（SKU 表 × 推送 GoodsInfo），不一致入 AMOUNT_MISMATCH 0 天
 *      转人工（回 0 防无限重试——平台数据不会因重试改变）；
 *   3. 发货：extendPremiumSubscription（与爱发电激活同一管道，同表
 *      不分叉）延长 subscriptions；
 *   4. 订单置 ACTIVATED + 回填 wxOrderId/daysGranted。
 * 退款（xpay_refund_notify）：首版冲减策略=仅记录+人工（附录 B #6）——
 * 订单置 REFUNDED 不自动扣减会员时长（客服口径明示），回 0。
 * 事务内处理；任何异常上抛由路由回非 0（平台重试 ≤15 次）。
 */
import prisma from "@/lib/prisma";
import { WXPAY_PRICE_TABLE } from "./config";
import type { DeliverNotify, RefundNotify } from "./notify.core";
import { extendPremiumSubscription } from "@/core/subscription/grant.service";

export type DeliverOutcome =
  | { kind: "OK" }
  | { kind: "DUPLICATED" } // 重放：订单已是终态（ACTIVATED/REFUNDED/…）
  | { kind: "MISMATCH"; reason: string }
  | { kind: "ORDER_NOT_FOUND" };

export class WxpayNotifyService {
  /** 发货：幂等 → 对单对账 → 续期 → 终态写回 */
  static async handleDeliver(n: DeliverNotify): Promise<DeliverOutcome> {
    return prisma.$transaction(async (tx) => {
      // 幂等闸门：wxOrderId 已存在于任何终态订单 → 重放，直接成功
      const byWxOrder = await tx.wxpayOrder.findUnique({
        where: { wxOrderId: n.mchOrderNo },
      });
      if (byWxOrder && byWxOrder.status !== "PENDING") {
        return { kind: "DUPLICATED" } as const;
      }

      const order = byWxOrder
        ? byWxOrder
        : await tx.wxpayOrder.findUnique({
            where: { outTradeNo: n.outTradeNo },
          });
      if (!order || order.status !== "PENDING") {
        return { kind: "ORDER_NOT_FOUND" } as const;
      }

      // 三方对账：订单 productId/份数/金额 vs 推送 GoodsInfo vs SKU 表
      const sku = WXPAY_PRICE_TABLE.find((r) => r.planKey === order.planKey);
      const expectedAmount = sku ? sku.priceFen * order.buyQuantity : -1;
      if (
        !sku ||
        n.productId !== order.productId ||
        n.quantity !== order.buyQuantity ||
        n.actualPriceFen !== order.amountFen ||
        order.amountFen !== expectedAmount
      ) {
        await tx.wxpayOrder.update({
          where: { orderid: order.orderid },
          data: {
            wxOrderId: n.mchOrderNo,
            status: "AMOUNT_MISMATCH",
          },
        });
        return {
          kind: "MISMATCH",
          reason:
            `productId=${n.productId}/${order.productId} qty=${n.quantity}/${order.buyQuantity} ` +
            `actual=${n.actualPriceFen}/${order.amountFen}/${expectedAmount}`,
        } as const;
      }

      const days = sku.days * order.buyQuantity;
      await extendPremiumSubscription(tx, order.userid!, days);

      await tx.wxpayOrder.update({
        where: { orderid: order.orderid },
        data: {
          wxOrderId: n.mchOrderNo,
          status: "ACTIVATED",
          daysGranted: days,
        },
      });
      return { kind: "OK" } as const;
    });
  }

  /** 退款：仅记录（订单置 REFUNDED），不自动扣减会员时长（人工口径） */
  static async handleRefund(n: RefundNotify): Promise<void> {
    const order = await prisma.wxpayOrder.findUnique({
      where: { outTradeNo: n.mchOrderId },
    });
    if (!order) {
      // 订单缺失（如下单记录被清理）：留 console 线索给人工对账
      console.error(
        `[wxpay-refund] 订单不存在：mchOrderId=${n.mchOrderId} wxRefundFee=${n.refundFeeFen}`,
      );
      return;
    }
    await prisma.wxpayOrder.update({
      where: { orderid: order.orderid },
      data: { status: "REFUNDED" },
    });
  }
}
