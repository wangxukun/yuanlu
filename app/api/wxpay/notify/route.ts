import { NextRequest, NextResponse } from "next/server";
import { readWxpayConfig } from "@/core/wxpay/config";
import {
  parseNotify,
  ackResponse,
  nackResponse,
  verifyNotifySignature,
} from "@/core/wxpay/notify.core";
import { WxpayNotifyService } from "@/core/wxpay/notify.service";

/**
 * POST /api/wxpay/notify — 平台推送入口（模块 E T4.4，对齐 /api/afdian/
 * webhook 先例：无登录鉴权，靠验签 + 幂等闸门自证）。
 *
 * 流程：原始 body 文本 → paySig 验签（uri=推送路径去 query）→ XML 解析
 * → 按 Event 分流（发货/退款）→ XML 回执（成功 ErrCode=0；失败非 0，
 * 平台按 2/4/8…重试至多 15 次）。未知事件回 0（防无意义重推）。
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const xmlReply = (body: string) =>
    new NextResponse(body, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });

  try {
    const config = readWxpayConfig(); // 配置缺失回非 0 交平台重试（部署期保护）
    const uri = new URL(request.url).pathname;
    const paySigHeader =
      request.headers.get("pay_sig") ?? request.headers.get("PaySig");
    if (
      !verifyNotifySignature({
        appKey: config.appKey,
        uri,
        rawBody,
        paySigHeader,
      })
    ) {
      return xmlReply(nackResponse("verify signature failed"));
    }

    const notify = parseNotify(rawBody);
    if (notify.event === "xpay_goods_deliver_notify") {
      const outcome = await WxpayNotifyService.handleDeliver(notify);
      if (outcome.kind === "OK" || outcome.kind === "DUPLICATED") {
        return xmlReply(ackResponse());
      }
      if (outcome.kind === "MISMATCH") {
        console.error(`[wxpay-notify] 对账不一致：${outcome.reason}`);
        return xmlReply(ackResponse()); // 已入账转人工，回 0 防无效重试
      }
      return xmlReply(nackResponse("order not found or not pending"));
    }
    if (notify.event === "xpay_refund_notify") {
      await WxpayNotifyService.handleRefund(notify);
      return xmlReply(ackResponse());
    }
    // 未知事件：回 0 终止重推（新事件类型上线时在此扩展）
    console.warn(`[wxpay-notify] 未知事件：${notify.rawEvent}`);
    return xmlReply(ackResponse());
  } catch (error) {
    console.error("[wxpay-notify] 处理异常：", error);
    return xmlReply(
      nackResponse(error instanceof Error ? error.message : "internal error"),
    );
  }
}
