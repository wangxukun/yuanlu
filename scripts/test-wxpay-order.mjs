/**
 * scripts/test-wxpay-order.mjs — 下单纯逻辑仿真（模块 E T4.3 验收）
 *
 * 直测 core/wxpay/order.core.ts（零依赖纯函数）+ 签名组装链联动：
 *   1. isValidBuyQuantity 边界（1/99 过，0/100/1.5/'2'/NaN 拒）；
 *   2. generateOutTradeNo：22 位、YR 前缀（非下划线开头）、仅大写字母数字、
 *      确定性（注入 now/rand）、时间戳段正确、随机段 36^6 空间取样不重复；
 *   3. 「金额恒来自 SKU 表」组装链：buildSignData 消费 SKU priceFen 而非
 *      任何前端值（signData 中 goodsPrice 与输入无关性由 T4.2 键序测试
 *      锁定，此处验证 SKU→signData 的字段贯通与官方式签名可复算）。
 * 运行：node scripts/test-wxpay-order.mjs（yuanlu 仓；不挂 weapp 测试链）
 */
import {
  isValidBuyQuantity,
  generateOutTradeNo,
  isValidOutTradeNo,
  BUY_QUANTITY_MIN,
  BUY_QUANTITY_MAX,
} from "../core/wxpay/order.core.ts";
import {
  buildSignData,
  computePaySig,
  computeSignature,
  CLIENT_PAY_URI,
} from "../core/wxpay/signature.ts";

let failed = 0;
function assert(cond, msg) {
  if (cond) {
    console.log("PASS:", msg);
  } else {
    console.error("FAIL:", msg);
    failed++;
  }
}

console.log("━━━ 一、购买数量边界 ━━━");
assert(
  BUY_QUANTITY_MIN === 1 && BUY_QUANTITY_MAX === 99,
  "边界常量 1-99（与 weapp plans.js 同口径）",
);
assert(isValidBuyQuantity(1) && isValidBuyQuantity(99), "1 与 99 合法");
assert(
  !isValidBuyQuantity(0) &&
    !isValidBuyQuantity(100) &&
    !isValidBuyQuantity(1.5) &&
    !isValidBuyQuantity("2") &&
    !isValidBuyQuantity(NaN) &&
    !isValidBuyQuantity(null),
  "0/100/小数/字符串/NaN/null 全拒",
);

console.log("━━━ 二、outTradeNo 生成 ━━━");
const NOW = new Date(2026, 9, 2, 15, 30, 45); // 2026-10-02 15:30:45
const seqRand = (() => {
  let i = 0;
  return () => [0, 0.5, 0.99][i++ % 3];
})();
const no1 = generateOutTradeNo(NOW, seqRand);
assert(
  no1.startsWith("YR20261002153045") && no1.length === 22,
  "YR+14 位时间戳+6 位随机 = 22 位（时间戳段正确）",
);
assert(no1[0] !== "_", "非下划线开头（微信红线）");
assert(
  isValidOutTradeNo(no1),
  "格式自校验通过（仅大写字母数字，无 I/O/0/1 混淆字符）",
);
assert(
  generateOutTradeNo(NOW, seqRand) === no1,
  "同 now+rand 确定性生成（可测性）",
);
assert(
  generateOutTradeNo(NOW) !== generateOutTradeNo(NOW),
  "默认随机两次不同（Math.random）",
);
assert(!isValidOutTradeNo("YR2026100215304 ABC"), "自校验拒含空格串");
const many = new Set(
  Array.from({ length: 500 }, () => generateOutTradeNo(NOW)),
);
assert(many.size === 500, "同秒 500 次生成无碰撞（随机段去混淆字母表）");

console.log("━━━ 三、SKU → signData 组装链 ━━━");
const sku = {
  planKey: "YEARLY",
  productId: "yuanlu_yearly",
  priceFen: 16800,
  days: 365,
};
const qty = 3;
const signData = buildSignData({
  offerId: "offer-1",
  buyQuantity: qty,
  productId: sku.productId,
  goodsPrice: sku.priceFen,
  outTradeNo: no1,
  attach: "user-1",
});
const parsed = JSON.parse(signData);
assert(
  parsed.productId === sku.productId &&
    parsed.goodsPrice === 16800 &&
    parsed.buyQuantity === 3,
  "SKU priceFen 贯通至 signData（金额分单源，组装链不引入前端值）",
);
assert(parsed.outTradeNo === no1, "outTradeNo 原样进 signData");
const paySig = computePaySig("appkey-x", CLIENT_PAY_URI, signData);
const signature = computeSignature("sessionkey-x", signData);
assert(
  /^[0-9a-f]{64}$/.test(paySig) && /^[0-9a-f]{64}$/.test(signature),
  "下单返回三件套可复算（官方式双签名 hex64）",
);
assert(
  computePaySig("appkey-x", CLIENT_PAY_URI, signData) === paySig &&
    computeSignature("sessionkey-x", signData) === signature,
  "同输入签名幂等（前端原样拉起的可复现基础）",
);

console.log("----------------------------------------");
if (failed === 0) {
  console.log("ALL WXPAY-ORDER TESTS PASSED");
} else {
  console.log(failed + " TEST(S) FAILED");
  process.exit(1);
}
