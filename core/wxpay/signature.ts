/**
 * core/wxpay/signature.ts — 虚拟支付双 HMAC 签名（模块 E T4.2）
 *
 * 官方口径（微信开放社区《虚拟支付签名》文档）：
 *   paySig    = to_hex(hmac_sha256(appKey,  uri + '&' + post_body))
 *   signature = to_hex(hmac_sha256(sessionKey, post_body))
 * ——均为 hex 小写；uri 不带参数（C 端拉起固定 'requestVirtualPayment'，
 *   后台 API 为不带 query 的路径）。
 *
 * 逐字节一致红线：参与签名的 post_body 必须与真正发起请求的 body 完全
 * 一致——本模块只接收/返回字符串，绝不重序列化；signData 串由
 * buildSignData 固定键序组装后原样签名、原样下发前端，全链路零改写。
 *
 * 官方示例向量见 scripts/test-wxpay-signature.mjs（getBalance 示例，
 * appkey="12345" / session_key="9hAb/NEYUlkaMBEsmFgzig=="）。
 */
import { createHmac } from "crypto";

export const CLIENT_PAY_URI = "requestVirtualPayment";

/** paySig：AppKey 对 uri + '&' + post_body 的 HMAC-SHA256（hex 小写） */
export function computePaySig(
  appKey: string,
  uri: string,
  postBody: string,
): string {
  return createHmac("sha256", appKey)
    .update(uri + "&" + postBody, "utf8")
    .digest("hex");
}

/** signature：sessionKey（code2Session）对 signData 串的 HMAC-SHA256（hex 小写） */
export function computeSignature(sessionKey: string, signData: string): string {
  return createHmac("sha256", sessionKey)
    .update(signData, "utf8")
    .digest("hex");
}

/** C 端道具直购 signData 字段（附录 A 口径；env 固定 0、币种固定 CNY） */
export interface SignDataFields {
  offerId: string;
  buyQuantity: number;
  productId: string;
  /** 道具单价（分）——SKU 表单源，不收前端价 */
  goodsPrice: number;
  outTradeNo: string;
  attach?: string;
}

/**
 * 固定键序组装 signData JSON 串（offerId → buyQuantity → env → currencyType
 * → productId → goodsPrice → outTradeNo → attach）。键序一经上线不可改动
 * （前端 payData 与签名共用本串，改序=改字节=签名作废重发版）。
 */
export function buildSignData(f: SignDataFields): string {
  const ordered = {
    offerId: f.offerId,
    buyQuantity: f.buyQuantity,
    env: 0,
    currencyType: "CNY",
    productId: f.productId,
    goodsPrice: f.goodsPrice,
    outTradeNo: f.outTradeNo,
    attach: f.attach ?? "",
  };
  return JSON.stringify(ordered);
}
