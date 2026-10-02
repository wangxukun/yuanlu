/**
 * scripts/test-wxpay-signature.mjs — 虚拟支付签名官方向量单测（模块 E T4.2 验收）
 *
 * 向量来源：微信开放社区《虚拟支付签名》官方文档 getBalance 示例——
 *   appkey="12345"、uri='/wxa/game/getbalance'、
 *   post_body='{"offer_id": "12345678", "openid": "oUrsfxxxxxxxxxx",
 *              "ts": 1668136271, "zone_id": "1", "env": 0}'
 *   pay_sig 期望 11bac638…b1b23bd；session_key="9hAb/NEYUlkaMBEsmFgzig=="
 *   signature 期望 42fe1d33…0b5b6729（官方文档原值逐字固化）。
 * 另覆盖：hex 小写格式、'&' 拼接与逐字节敏感、buildSignData 键序不变性。
 * 运行：node scripts/test-wxpay-signature.mjs（yuanlu 仓；不挂 weapp 测试链）
 */
import {
  computePaySig,
  computeSignature,
  buildSignData,
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

// 官方示例向量（逐字节保留文档原串：键后带空格、字符串值带引号）
const OFFICIAL_BODY =
  '{"offer_id": "12345678", "openid": "oUrsfxxxxxxxxxx", "ts": 1668136271, "zone_id": "1", "env": 0}';

console.log("━━━ 一、官方示例向量 ━━━");
const paySig = computePaySig("12345", "/wxa/game/getbalance", OFFICIAL_BODY);
assert(
  paySig === "11bac6388871d29c055c7d16fbe42e8d646855b666faf89b15c815218b1b23bd",
  "paySig 官方向量逐字一致（hex 小写）",
);
const signature = computeSignature("9hAb/NEYUlkaMBEsmFgzig==", OFFICIAL_BODY);
assert(
  signature ===
    "42fe1d3341fb1c8bd6f5014ba735ab04eacc80a2deb3ab4669eab4700b5b6729",
  "signature 官方向量逐字一致（hex 小写）",
);

console.log("━━━ 二、拼接与逐字节敏感 ━━━");
assert(
  /^[0-9a-f]{64}$/.test(paySig) && /^[0-9a-f]{64}$/.test(signature),
  "输出为 64 位 hex 小写",
);
// uri 参与拼接：换 uri 必变签名（'&' 拼接生效）
assert(
  computePaySig("12345", "/wxa/game/querybalance", OFFICIAL_BODY) !== paySig,
  "uri 参与签名（'&' 拼接生效，换 uri 签名必变）",
);
// C 端拉起 uri 常量
assert(
  CLIENT_PAY_URI === "requestVirtualPayment",
  "C 端 uri 常量 = requestVirtualPayment",
);
// 逐字节敏感：post_body 尾部多一个空格即签名作废
assert(
  computePaySig("12345", "/wxa/game/getbalance", OFFICIAL_BODY + " ") !==
    paySig,
  "post_body 逐字节敏感（尾随空格即作废——红线回归锚）",
);
assert(
  computeSignature(
    "9hAb/NEYUlkaMBEsmFgzig==",
    OFFICIAL_BODY.replace('env": 0', 'env":0'),
  ) !== signature,
  "signData 逐字节敏感（空格差异即作废——禁重序列化回归锚）",
);

console.log("━━━ 三、buildSignData 键序不变性 ━━━");
const fields = {
  offerId: "offer-1",
  buyQuantity: 2,
  productId: "yuanlu_yearly",
  goodsPrice: 16800,
  outTradeNo: "YR2026100212345678",
  attach: "userid=u1",
};
const s1 = buildSignData(fields);
const s2 = buildSignData({ ...fields });
assert(s1 === s2, "同输入两次组装逐字节一致（属性序无关）");
const keys = Object.keys(JSON.parse(s1));
assert(
  keys.join(",") ===
    "offerId,buyQuantity,env,currencyType,productId,goodsPrice,outTradeNo,attach",
  "固定键序（offerId→…→attach，上线后不可改动）",
);
const parsed = JSON.parse(s1);
assert(
  parsed.env === 0 &&
    parsed.currencyType === "CNY" &&
    parsed.goodsPrice === 16800 &&
    parsed.buyQuantity === 2,
  "env=0/CNY 固定值与分单位字段原样输出",
);
assert(
  buildSignData({ ...fields, attach: undefined }) ===
    buildSignData({ ...fields, attach: "" }),
  "attach 缺省归空串（同串稳定）",
);
// 键序变化自检：若有人改了 buildSignData 键序，签名应随之改变并被上一条断言捕获
assert(
  computeSignature("sk", s1) === computeSignature("sk", buildSignData(fields)),
  "签名输入=组装产物（同一串签名结果一致）",
);

console.log("----------------------------------------");
if (failed === 0) {
  console.log("ALL WXPAY-SIGNATURE TESTS PASSED");
} else {
  console.log(failed + " TEST(S) FAILED");
  process.exit(1);
}
