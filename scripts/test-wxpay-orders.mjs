/**
 * scripts/test-wxpay-orders.mjs — C 端订单列表纯逻辑仿真（订单中心页配套）
 *
 * 直测 core/wxpay/orders.core.ts（零依赖纯函数）：
 *   1. 档位/状态标签：四档 + 五态 C 端文案逐字（admin 面向运营「已发货」，
 *      C 端面向买家「已完成」，同源不同名是口径不是漂移）；未知键回退原值；
 *   2. fenToYuan 边界：常规档价 / 0 / 1 分 / 负数 / 非数（NaN/字符串/null）
 *      的格式化与兜底；
 *   3. toUserOrderDto：字段白名单（productId/wxOrderId/orderid/userid 不
 *      下发——最小披露红线）、Date→ISO 串、字符串直传、标签回退、
 *      列表映射保序。
 * 运行：node scripts/test-wxpay-orders.mjs（yuanlu 仓；不挂 weapp 测试链）
 */
import {
  USER_ORDER_TAKE,
  USER_PLAN_LABELS,
  USER_STATUS_LABELS,
  fenToYuan,
  toUserOrderDto,
} from "../core/wxpay/orders.core.ts";

let failed = 0;
function assert(cond, msg) {
  if (cond) {
    console.log("PASS:", msg);
  } else {
    console.error("FAIL:", msg);
    failed++;
  }
}

console.log("━━━ 一、档位与状态标签（C 端文案） ━━━");
assert(
  USER_PLAN_LABELS.WEEKLY === "周卡" &&
    USER_PLAN_LABELS.MONTHLY === "月卡" &&
    USER_PLAN_LABELS.QUARTERLY === "季卡" &&
    USER_PLAN_LABELS.YEARLY === "年卡" &&
    Object.keys(USER_PLAN_LABELS).length === 4,
  "四档档位名逐字（与 admin PLAN_LABELS 同文案）",
);
assert(
  USER_STATUS_LABELS.PENDING === "待支付" &&
    USER_STATUS_LABELS.ACTIVATED === "已完成" &&
    USER_STATUS_LABELS.AMOUNT_MISMATCH === "处理中" &&
    USER_STATUS_LABELS.REFUNDED === "已退款" &&
    USER_STATUS_LABELS.CLOSED === "已关闭" &&
    Object.keys(USER_STATUS_LABELS).length === 5,
  "五态 C 端文案逐字（买家视角，区别于 admin 运营视角）",
);
assert(
  (USER_PLAN_LABELS["PROMO"] ?? "PROMO") === "PROMO" &&
    (USER_STATUS_LABELS["WEIRD"] ?? "WEIRD") === "WEIRD",
  "未知键回退原值（映射层不吞新状态）",
);
assert(USER_ORDER_TAKE === 100, "拉取上限 100（与 admin take 同量级）");

console.log("━━━ 二、fenToYuan 边界 ━━━");
assert(fenToYuan(500) === "5.00", "周卡 500 分 → 5.00");
assert(fenToYuan(1800) === "18.00", "月卡 1800 分 → 18.00");
assert(fenToYuan(4800) === "48.00", "季卡 4800 分 → 48.00");
assert(fenToYuan(16800) === "168.00", "年卡 16800 分 → 168.00");
assert(fenToYuan(0) === "0.00" && fenToYuan(1) === "0.01", "0 与 1 分边界");
assert(
  fenToYuan(NaN) === "0.00" &&
    fenToYuan("500") === "0.00" &&
    fenToYuan(null) === "0.00" &&
    fenToYuan(undefined) === "0.00",
  "非数入参兜底 0.00（不 NaN 污染前端）",
);
assert(
  fenToYuan(499.6) === "5.00" && fenToYuan(498.5) === "4.99",
  "小数分四舍五入到分",
);

console.log("━━━ 三、toUserOrderDto 白名单与映射 ━━━");
const row = {
  orderid: 7,
  outTradeNo: "YR20261003120000ABCDEFGH",
  wxOrderId: "wx-order-internal-1",
  userid: "user-1",
  planKey: "YEARLY",
  productId: "yuanlu_yearly",
  buyQuantity: 2,
  amountFen: 33600,
  daysGranted: 730,
  status: "ACTIVATED",
  createAt: new Date("2026-10-03T04:00:00.000Z"),
};
const dto = toUserOrderDto(row);
assert(
  dto.outTradeNo === "YR20261003120000ABCDEFGH" &&
    dto.planKey === "YEARLY" &&
    dto.planName === "年卡" &&
    dto.buyQuantity === 2 &&
    dto.amountYuan === "336.00" &&
    dto.daysGranted === 730 &&
    dto.status === "ACTIVATED" &&
    dto.statusLabel === "已完成" &&
    dto.createAt === "2026-10-03T04:00:00.000Z",
  "常规行映射逐字段（金额分→元、Date→ISO、标签落位）",
);
assert(
  !("orderid" in dto) &&
    !("wxOrderId" in dto) &&
    !("userid" in dto) &&
    !("productId" in dto),
  "白名单外字段不下发（平台/内部标识最小披露）",
);
assert(
  Object.keys(dto).length === 9,
  "DTO 恰 9 字段（新增字段须同步测试与前端消费方）",
);

const passthrough = toUserOrderDto({
  outTradeNo: "YR20261003120001IJKLMNPQ",
  planKey: "LIFETIME",
  buyQuantity: 1,
  amountFen: 0,
  daysGranted: 0,
  status: "REFUNDING",
  createAt: "2026-10-03T05:00:00.000Z",
});
assert(
  passthrough.planName === "LIFETIME" &&
    passthrough.statusLabel === "REFUNDING" &&
    passthrough.amountYuan === "0.00" &&
    passthrough.createAt === "2026-10-03T05:00:00.000Z",
  "未知档位/状态回退原值、字符串 createAt 直传",
);

const list = [row, passthrough].map(toUserOrderDto);
assert(
  list.length === 2 &&
    list[0].outTradeNo === row.outTradeNo &&
    list[1].status === "REFUNDING",
  "列表映射保序（route 侧 createAt 倒序即最终展示序）",
);

console.log("----------------------------------------");
if (failed === 0) {
  console.log("ALL WXPAY-ORDERS TESTS PASSED");
} else {
  console.log(failed + " TEST(S) FAILED");
  process.exit(1);
}
