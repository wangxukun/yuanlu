/**
 * scripts/test-wxpay-config.mjs — 虚拟支付配置层仿真（模块 E T4.1 验收）
 *
 * 直测 core/wxpay/config.ts（零依赖纯函数，Node ≥22 直跑 .ts）：
 *   1. 基础 env 缺失 → 汇总显式报错（列出全部缺失键，不静默）；
 *   2. 齐全 → 成功返回；道具 productId 缺失不阻断 readWxpayConfig（分批回填）；
 *   3. getWxpaySku：道具未回填显式报错（含回填指引）/未知档位报错/齐全返回 SKU；
 *   4. 价格表与 AFDIAN_PLANS 元单位 ×100 对齐（500/1800/4800/16800 分）。
 * 运行：node scripts/test-wxpay-config.mjs（yuanlu 仓；不挂 weapp 测试链）
 */
import {
  WXPAY_PRICE_TABLE,
  readWxpayConfig,
  getWxpaySku,
} from "../core/wxpay/config.ts";

let failed = 0;
function assert(cond, msg) {
  if (cond) {
    console.log("PASS:", msg);
  } else {
    console.error("FAIL:", msg);
    failed++;
  }
}
function assertThrows(fn, includes, msg) {
  try {
    fn();
    assert(false, msg + "（未抛错）");
  } catch (e) {
    assert(
      e instanceof Error && e.message.includes(includes),
      `${msg}（文案含「${includes}」，实际「${e.message}」）`,
    );
  }
}

const BASE_ENV = {
  WXPAY_APPID: "wx-test-appid",
  WXPAY_APP_SECRET: "test-secret",
  WXPAY_OFFER_ID: "offer-123",
  WXPAY_APP_KEY: "test-appkey",
};
function setEnv(overrides = {}) {
  for (const k of Object.keys(process.env)) {
    if (k.startsWith("WXPAY_")) delete process.env[k];
  }
  Object.assign(process.env, BASE_ENV, overrides);
}

console.log("━━━ 一、配置缺失显式报错 ━━━");
setEnv({ WXPAY_OFFER_ID: "", WXPAY_APP_KEY: "" });
assertThrows(
  () => readWxpayConfig(),
  "WXPAY_OFFER_ID、WXPAY_APP_KEY",
  "缺失项汇总一次性抛出（两键并列）",
);
setEnv({ WXPAY_APPID: "" });
assertThrows(() => readWxpayConfig(), "WXPAY_APPID", "单键缺失也显式报错");
setEnv({ WXPAY_APP_SECRET: "" });
assertThrows(
  () => readWxpayConfig(),
  "WXPAY_APP_SECRET",
  "code2Session 凭据缺失同样拦截（虚拟支付链路整体不可用）",
);

console.log("━━━ 二、齐全读取与道具分批回填 ━━━");
setEnv(); // 基础四件齐，道具全未配
const cfg = readWxpayConfig();
assert(
  cfg.offerId === "offer-123" && cfg.appKey === "test-appkey",
  "基础配置齐全读取",
);
assert(
  Object.keys(cfg.skus).length === 0,
  "道具未回填不阻断 readWxpayConfig（允许分批配置）",
);

console.log("━━━ 三、getWxpaySku 档位校验 ━━━");
assertThrows(
  () => getWxpaySku("WEEKLY"),
  "WXPAY_PRODUCT_ID_WEEKLY",
  "道具未回填显式报错（含 env 键名指引）",
);
assertThrows(() => getWxpaySku("LIFETIME"), "未知订阅档位", "未知档位拒绝");
setEnv({ WXPAY_PRODUCT_ID_YEARLY: "prod-yearly-1" });
const sku = getWxpaySku("YEARLY");
assert(
  sku.productId === "prod-yearly-1" &&
    sku.priceFen === 16800 &&
    sku.days === 365,
  "已回填档位返回完整 SKU（productId+分价+天数）",
);
setEnv({
  WXPAY_PRODUCT_ID_WEEKLY: "p-w",
  WXPAY_PRODUCT_ID_MONTHLY: "p-m",
  WXPAY_PRODUCT_ID_QUARTERLY: "p-q",
  WXPAY_PRODUCT_ID_YEARLY: "p-y",
});
assert(
  Object.keys(readWxpayConfig().skus).length === 4,
  "四档道具全部回填后 skus 齐备",
);

console.log("━━━ 四、价格表单源对齐 ━━━");
assert(
  WXPAY_PRICE_TABLE.map((r) => r.priceFen).join(",") === "500,1800,4800,16800",
  "四档分价 500/1800/4800/16800（=¥5/¥18/¥48/¥168 ×100）",
);
assert(
  WXPAY_PRICE_TABLE.map((r) => r.days).join(",") === "7,30,90,365",
  "天数 7/30/90/365（与 afdian-plans 同源，两处改动须同步）",
);

console.log("----------------------------------------");
if (failed === 0) {
  console.log("ALL WXPAY-CONFIG TESTS PASSED");
} else {
  console.log(failed + " TEST(S) FAILED");
  process.exit(1);
}
