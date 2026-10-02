/**
 * core/wxpay/reconcile.service.ts — 兜底查单补发货（模块 E T4.5）
 *
 * 推送丢失/处理失败时的最终一致保证：PENDING 超过窗口的订单逐单调
 * query_order（pay_sig 签名 + access_token），按平台 status 分流：
 *   已支付(2/3/4) → 构造 DeliverNotify 复用 WxpayNotifyService.handleDeliver
 *     ——与推送路径共用 wxOrderId 幂等闸门 + 三方对账 + extendPremiumSubscription
 *     续期管道，补发货与推送到达不双发（验收口径）；
 *   退款(5/8) → 置 REFUNDED（人工口径）；关闭(6) → CLOSED；
 *   未支付(0/1) → 留 PENDING 下轮再看。
 * 定时幂等：每轮只取 PENDING（终态天然跳过）；节流在 route 层。
 */
import prisma from "@/lib/prisma";
import { readWxpayConfig } from "./config";
import { computePaySig } from "./signature";
import {
  QUERY_ORDER_URI,
  QUERY_ORDER_URL,
  PENDING_MIN_AGE_MS,
  RECONCILE_BATCH,
  buildQueryOrderBody,
  mapOrderStatusToAction,
} from "./query.core";
import { getWxAccessToken } from "./access-token";
import { WxpayNotifyService } from "./notify.service";
import type { DeliverNotify } from "./notify.core";

interface QueryOrderResponse {
  errcode?: number;
  errmsg?: string;
  order?: {
    status: number;
    /** 用户支付金额（分） */
    paid_fee?: number;
    /** 渠道单号 = 微信支付商户单号（推送 MchOrderNo 语义） */
    channel_order_id?: string;
    /** 微信支付交易单号 */
    wxpay_order_id?: string;
    paid_time?: number;
  };
}

export interface ReconcileSummary {
  checked: number;
  delivered: number;
  refundMarked: number;
  closed: number;
  waiting: number;
  skipped: number;
}

interface QueryOutcome {
  action: ReturnType<typeof mapOrderStatusToAction>;
  res?: QueryOrderResponse;
}

/** 调 query_order（fetch 可注入供仿真） */
async function queryOrder(
  openid: string,
  outTradeNo: string,
  fetchImpl: typeof fetch = fetch,
): Promise<QueryOutcome> {
  const { appKey } = readWxpayConfig();
  const body = buildQueryOrderBody(openid, outTradeNo);
  const paySig = computePaySig(appKey, QUERY_ORDER_URI, body);
  const token = await getWxAccessToken();
  const res = await fetchImpl(
    `${QUERY_ORDER_URL}?access_token=${encodeURIComponent(token)}&pay_sig=${paySig}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body },
  );
  if (!res.ok) {
    return { action: "UNKNOWN" as const };
  }
  const data = (await res.json()) as QueryOrderResponse;
  if (data.errcode) {
    console.error(
      `[wxpay-reconcile] query_order 失败 ${outTradeNo}：${data.errcode} ${data.errmsg ?? ""}`,
    );
    return { action: "UNKNOWN" as const, res: data };
  }
  return {
    action: mapOrderStatusToAction(data.order?.status ?? -1),
    res: data,
  };
}

export class WxpayReconcileService {
  /** 单轮兜底：查 PENDING 单 → 查单分流 → 补发货/终态标记（fetch 可注入） */
  static async runReconcile(
    fetchImpl?: typeof fetch,
  ): Promise<ReconcileSummary> {
    const summary: ReconcileSummary = {
      checked: 0,
      delivered: 0,
      refundMarked: 0,
      closed: 0,
      waiting: 0,
      skipped: 0,
    };
    const cutoff = new Date(Date.now() - PENDING_MIN_AGE_MS);
    const pendings = await prisma.wxpayOrder.findMany({
      where: { status: "PENDING", createAt: { lt: cutoff } },
      orderBy: { createAt: "asc" },
      take: RECONCILE_BATCH,
    });

    for (const order of pendings) {
      summary.checked += 1;
      const user = await prisma.user.findUnique({
        where: { userid: order.userid! },
        select: { wxOpenId: true },
      });
      if (!user?.wxOpenId) {
        summary.skipped += 1;
        continue;
      }

      const { action, res } = await queryOrder(
        user.wxOpenId,
        order.outTradeNo,
        fetchImpl,
      );
      if (action === "DELIVER") {
        const o = res!.order!;
        const deliver: DeliverNotify = {
          event: "xpay_goods_deliver_notify",
          openid: user.wxOpenId,
          outTradeNo: order.outTradeNo,
          env: 0,
          mchOrderNo: o.channel_order_id ?? "",
          transactionId: o.wxpay_order_id ?? "",
          paidTime: o.paid_time ?? 0,
          // GoodsInfo 从本地订单行回填（query_order 不回传道具明细）；
          // paid_fee 走 handleDeliver 三方对账
          productId: order.productId,
          quantity: order.buyQuantity,
          origPriceFen: order.amountFen,
          actualPriceFen: o.paid_fee ?? -1,
          attach: order.userid ?? "",
        };
        const out = await WxpayNotifyService.handleDeliver(deliver);
        if (out.kind === "OK") summary.delivered += 1;
        else if (out.kind === "DUPLICATED")
          summary.delivered += 1; // 已处理（幂等）
        else summary.skipped += 1; // MISMATCH / NOT_FOUND → 人工
      } else if (action === "REFUND_MARK") {
        await prisma.wxpayOrder.update({
          where: { orderid: order.orderid },
          data: { status: "REFUNDED" },
        });
        summary.refundMarked += 1;
      } else if (action === "CLOSE") {
        await prisma.wxpayOrder.update({
          where: { orderid: order.orderid },
          data: { status: "CLOSED" },
        });
        summary.closed += 1;
      } else if (action === "WAIT") {
        summary.waiting += 1;
      } else {
        summary.skipped += 1;
      }
    }
    return summary;
  }
}
