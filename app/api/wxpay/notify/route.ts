import { NextRequest, NextResponse } from "next/server";
import { readWxpayConfig } from "@/core/wxpay/config";
import {
  parseNotify,
  ackResponse,
  nackResponse,
  verifyNotifySignature,
  verifyMessagePushSignature,
} from "@/core/wxpay/notify.core";
import { WxpayNotifyService } from "@/core/wxpay/notify.service";

/**
 * GET /api/wxpay/notify — 消息推送 Token 验证握手（T5.4 真机联调落地，
 * 2026-10-02）：官方 person.html 明确发货推送 URL 配置在【开发管理 →
 * 消息推送】（通用 Token/echostr 通道）——保存配置时平台 GET 本路由，
 * query 带 signature/timestamp/nonce/echostr，校验 SHA1(sort(token,
 * timestamp, nonce)) 通过后原样回显 echostr。token=env WXPAY_PUSH_TOKEN
 * （与 MP 后台该页填写的 Token 同值）。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const signature = searchParams.get("signature") ?? "";
  const timestamp = searchParams.get("timestamp") ?? "";
  const nonce = searchParams.get("nonce") ?? "";
  const echostr = searchParams.get("echostr") ?? "";
  const token = process.env.WXPAY_PUSH_TOKEN ?? "";
  if (
    !verifyMessagePushSignature({ token, timestamp, nonce, signature }) ||
    !echostr
  ) {
    return new NextResponse("forbidden", { status: 403 });
  }
  return new NextResponse(echostr, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * POST /api/wxpay/notify — 平台推送入口（模块 E T4.4，对齐 /api/afdian/
 * webhook 先例：无登录鉴权，靠验签 + 幂等闸门自证）。
 *
 * 验签双轨（校正点①，2026-10-02）：①通用消息推送 query 签名（SHA1
 * sort(token,timestamp,nonce)，【开发管理 → 消息推送】通道的推送形态）
 * → ②pay_sig 头 HMAC（uri+body，社区惯例形态）。任一通过即受理。
 * 流程：原始 body 文本 → 验签 → XML 解析 → 按 Event 分流（发货/退款）
 * → XML 回执（成功 ErrCode=0；失败非 0，平台按 2/4/8…重试至多 15 次）。
 * 未知事件回 0（防无意义重推）。
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
    const url = new URL(request.url);
    const uri = url.pathname;
    const paySigHeader =
      request.headers.get("pay_sig") ?? request.headers.get("PaySig");
    const verified =
      verifyNotifySignature({
        appKey: config.appKey,
        uri,
        rawBody,
        paySigHeader,
      }) ||
      verifyMessagePushSignature({
        token: process.env.WXPAY_PUSH_TOKEN ?? "",
        timestamp: url.searchParams.get("timestamp") ?? "",
        nonce: url.searchParams.get("nonce") ?? "",
        signature: url.searchParams.get("signature") ?? "",
      });
    if (!verified) {
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
