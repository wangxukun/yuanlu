/**
 * core/wxpay/notify.core.ts — 发货/退款推送纯逻辑（模块 E T4.4）
 *
 * 平台推送为 XML（字段结构=官方文档字段表：Event/OpenId/OutTradeNo/Env/
 * WeChatPayInfo{MchOrderNo,TransactionId,PaidTime}/GoodsInfo{ProductId,
 * Quantity,OrigPrice,ActualPrice,Attach}；退款 WxRefundId/MchOrderId/…）。
 * 零第三方依赖手写浅层解析（仓库无 XML 库，结构固定单层+两嵌套，regex
 * 足够且可直测）。回执逐字=官方格式：<xml><ErrCode>0</ErrCode><ErrMsg>
 * <![CDATA[success]]></ErrMsg></xml>（失败非 0，平台重试 ≤15 次）。
 *
 * 注意：验签处内联 HMAC 而非 import ./signature——TS 无扩展名相对导入
 * 无法被 Node 直跑仿真解析（keep 零依赖）；与 signature.ts 同式，两处
 * 算法一致性由官方向量单测共同把门。
 */
import { createHash, createHmac } from "crypto";

export type WxpayNotifyEvent =
  | "xpay_goods_deliver_notify"
  | "xpay_refund_notify";

export interface DeliverNotify {
  event: "xpay_goods_deliver_notify";
  openid: string;
  outTradeNo: string;
  env: number;
  /** 微信支付商户单号 = 发货幂等键 */
  mchOrderNo: string;
  transactionId: string;
  paidTime: number;
  productId: string;
  quantity: number;
  origPriceFen: number;
  actualPriceFen: number;
  attach: string;
}

export interface RefundNotify {
  event: "xpay_refund_notify";
  openid: string;
  mchRefundId: string;
  /** 退款单对应的原支付商户单号（= 下单 outTradeNo） */
  mchOrderId: string;
  wxOrderId: string;
  refundFeeFen: number;
  /** 0 = 退款成功 */
  retCode: number;
  retMsg: string;
}

/** 取 <tag>…</tag> 或 <tag><![CDATA[…]]></tag> 的内文（无则 null） */
export function extractTag(xml: string, tag: string): string | null {
  const m = xml.match(
    new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`),
  );
  return m ? m[1].trim() : null;
}

function toInt(v: string | null): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 解析推送 XML → 按 Event 分流。未知事件/缺关键字段返回 { event: null }，
 * rawEvent 供调用方决定回执口径：未知事件回 0（防平台无限重推无意义报文），
 * 已知事件缺字段回非 0（重试可能补全）。
 */
export function parseNotify(
  xml: string,
): DeliverNotify | RefundNotify | { event: null; rawEvent: string | null } {
  const rawEvent = extractTag(xml, "Event");
  if (rawEvent === "xpay_goods_deliver_notify") {
    const openid = extractTag(xml, "OpenId");
    const outTradeNo = extractTag(xml, "OutTradeNo");
    const mchOrderNo = extractTag(xml, "MchOrderNo");
    const productId = extractTag(xml, "ProductId");
    if (!openid || !outTradeNo || !mchOrderNo || !productId) {
      return { event: null, rawEvent };
    }
    return {
      event: rawEvent,
      openid,
      outTradeNo,
      env: toInt(extractTag(xml, "Env")),
      mchOrderNo,
      transactionId: extractTag(xml, "TransactionId") ?? "",
      paidTime: toInt(extractTag(xml, "PaidTime")),
      productId,
      quantity: toInt(extractTag(xml, "Quantity")),
      origPriceFen: toInt(extractTag(xml, "OrigPrice")),
      actualPriceFen: toInt(extractTag(xml, "ActualPrice")),
      attach: extractTag(xml, "Attach") ?? "",
    };
  }
  if (rawEvent === "xpay_refund_notify") {
    const mchOrderId = extractTag(xml, "MchOrderId");
    if (!mchOrderId) {
      return { event: null, rawEvent };
    }
    return {
      event: rawEvent,
      openid: extractTag(xml, "OpenId") ?? "",
      mchRefundId: extractTag(xml, "MchRefundId") ?? "",
      mchOrderId,
      wxOrderId: extractTag(xml, "WxOrderId") ?? "",
      refundFeeFen: toInt(extractTag(xml, "RefundFee")),
      retCode: toInt(extractTag(xml, "RetCode")),
      retMsg: extractTag(xml, "RetMsg") ?? "",
    };
  }
  return { event: null, rawEvent };
}

/** 成功回执（官方格式逐字） */
export function ackResponse(): string {
  return "<xml><ErrCode>0</ErrCode><ErrMsg><![CDATA[success]]></ErrMsg></xml>";
}

/** 失败回执（非 0 → 平台按 2/4/8…重试至多 15 次） */
export function nackResponse(errMsg: string): string {
  const safe = errMsg.replace(/]]>/g, "]]&gt;").slice(0, 200);
  return `<xml><ErrCode>1</ErrCode><ErrMsg><![CDATA[${safe}]]></ErrMsg></xml>`;
}

/**
 * 推送验签：官方文档正文未载明推送签名头细节（person.html 提示「签名
 * 函数与官方文档签名一致」），按 paySig 同款对原始 body 验算——uri 取
 * 推送 URL 路径（去 query）。头缺失/不匹配 → false。
 * 头字段名以真机首单实测为准（T5.4 联调校正点，当前按社区惯例小写
 * pay_sig 头实现）。
 */
export function verifyNotifySignature(input: {
  appKey: string;
  uri: string;
  rawBody: string;
  paySigHeader: string | null;
}): boolean {
  if (!input.paySigHeader) return false;
  const computed = createHmac("sha256", input.appKey)
    .update(input.uri + "&" + input.rawBody, "utf8")
    .digest("hex");
  return input.paySigHeader.toLowerCase() === computed;
}

/**
 * 通用消息推送验签（T5.4 真机联调落地，2026-10-02）：官方 person.html
 * 明确发货推送 URL 配置在【开发管理 → 消息推送】（通用 Token/echostr
 * 通道，明文模式）——推送 POST 的 query 带 signature/timestamp/nonce，
 * 校验式 = SHA1(sort([token, timestamp, nonce]).join(''))，与公众号/
 * 小程序消息推送同款。token = MP 后台该页填写的 Token（env
 * WXPAY_PUSH_TOKEN 同值）。
 */
export function verifyMessagePushSignature(input: {
  token: string;
  timestamp: string;
  nonce: string;
  signature: string;
}): boolean {
  if (!input.token || !input.timestamp || !input.nonce || !input.signature) {
    return false;
  }
  const computed = createHash("sha1")
    .update([input.token, input.timestamp, input.nonce].sort().join(""), "utf8")
    .digest("hex");
  return computed === input.signature;
}
