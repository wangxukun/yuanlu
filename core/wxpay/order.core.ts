/**
 * core/wxpay/order.core.ts — 下单纯逻辑（模块 E T4.3）
 *
 * 零依赖纯函数：outTradeNo 生成与购买数量校验，供 order.service 组合
 * prisma/签名使用；scripts/test-wxpay-order.mjs 直测（Node ≥22）。
 */

/** buyQuantity 边界（与 weapp utils/plans.js QTY_MIN/MAX 同口径，两处同步改） */
export const BUY_QUANTITY_MIN = 1;
export const BUY_QUANTITY_MAX = 99;

/** 购买数量合法：1-99 的整数 */
export function isValidBuyQuantity(q: unknown): q is number {
  return (
    typeof q === "number" &&
    Number.isInteger(q) &&
    q >= BUY_QUANTITY_MIN &&
    q <= BUY_QUANTITY_MAX
  );
}

const OUT_TRADE_NO_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * 生成商户单号：'YR' + yyyyMMddHHmmss（14 位）+ 6 位随机大写字母数字
 * = 22 位——落在微信 8-32 位区间、非下划线开头；去除易混淆字符
 * （I/O/0/1）。now/rand 注入便于确定性单测；唯一性由数据库
 * out_trade_no 唯一索引兜底（时间戳+随机的 36^6 空间碰撞概率可忽略）。
 */
export function generateOutTradeNo(
  now: Date = new Date(),
  rand: () => number = Math.random,
): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  const ts =
    `${p(now.getFullYear(), 4)}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix +=
      OUT_TRADE_NO_ALPHABET[Math.floor(rand() * OUT_TRADE_NO_ALPHABET.length)];
  }
  return `YR${ts}${suffix}`;
}

/** 商户单号格式自校验（8-32 位、非下划线开头、仅大写字母数字） */
export function isValidOutTradeNo(no: string): boolean {
  return (
    /^YR[0-9]{14}[A-HJ-NP-Z2-9]{6}$/.test(no) &&
    no.length >= 8 &&
    no.length <= 32
  );
}
