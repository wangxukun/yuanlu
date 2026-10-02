/**
 * core/wxpay/query.core.ts — 兜底查单纯逻辑（模块 E T4.5）
 *
 * 官方 query_order 口径（微信开放社区服务端 API 文档）：
 *   POST https://api.weixin.qq.com/xpay/query_order?access_token=T&pay_sig=S
 *   body={openid, env:0, order_id(=商户 outTradeNo)}；pay_sig 用 paySig
 *   同款算法（uri='/xpay/query_order'，post_body 与请求体逐字节一致）。
 * 响应 order.status 枚举：0 初始化 / 1 创建成功(未支付) / 2 已支付待发货 /
 * 3 发货中 / 4 已发货 / 5 已退款 / 6 已关闭 / 7 退款失败 / 8 用户退款完成。
 * 零依赖纯函数，scripts/test-wxpay-reconcile.mjs 直测。
 */

export const QUERY_ORDER_URI = "/xpay/query_order";
export const QUERY_ORDER_URL = "https://api.weixin.qq.com/xpay/query_order";

/** PENDING 订单纳入查单的最小年龄：给平台推送留窗口（毫秒） */
export const PENDING_MIN_AGE_MS = 2 * 60 * 1000;
/** 单轮查单批量上限（防雪崩；下一轮继续） */
export const RECONCILE_BATCH = 50;
/** 触发节流窗口（毫秒） */
export const RECONCILE_THROTTLE_MS = 5 * 60 * 1000;

/** 查单请求体（固定键序 openid→env→order_id；与 pay_sig 签名同一串） */
export function buildQueryOrderBody(
  openid: string,
  outTradeNo: string,
): string {
  return JSON.stringify({ openid, env: 0, order_id: outTradeNo });
}

export type QueryOrderAction =
  | "DELIVER" // 已支付待发货/发货中/已发货（本地漏发）→ 补发货
  | "REFUND_MARK" // 退款完成 → 订单置 REFUNDED（人工口径，不动订阅）
  | "CLOSE" // 已关闭 → 订单置 CLOSED
  | "WAIT" // 初始化/未支付 → 留 PENDING 下轮再看
  | "UNKNOWN";

/** 平台订单状态 → 兜底动作 */
export function mapOrderStatusToAction(status: number): QueryOrderAction {
  if (status === 2 || status === 3 || status === 4) return "DELIVER";
  if (status === 5 || status === 8) return "REFUND_MARK";
  if (status === 6) return "CLOSE";
  if (status === 0 || status === 1) return "WAIT";
  return "UNKNOWN";
}

/** 触发节流判定（route 层用；返回 true=本轮可跑） */
export function shouldRunReconcile(
  lastRunAt: number | null,
  now: number,
): boolean {
  if (!lastRunAt) return true;
  return now - lastRunAt >= RECONCILE_THROTTLE_MS;
}
