/**
 * scripts/test-wxpay-reconcile.mjs — 兜底查单仿真（模块 E T4.5 验收）
 *
 * 覆盖：纯函数（查单体键序/状态映射全枚举/节流判定）、access_token 缓存
 * （命中不重取+force 刷新）、runReconcile 全仿真（mock prisma + 注入
 * query_order fetch + 全局 token fetch）：已支付补发货、二次轮跑幂等
 * （PENDING 过滤）、未支付留候、关闭单 CLOSED、接口失败 skip、
 * pay_sig 与请求体逐字节可复算。
 * 运行：node scripts/test-wxpay-reconcile.mjs（yuanlu 仓；不挂 weapp 测试链）
 */
import { registerHooks } from "node:module";

let failed = 0;
function assert(cond, msg) {
  if (cond) {
    console.log("PASS:", msg);
  } else {
    console.error("FAIL:", msg);
    failed++;
  }
}

console.log("━━━ 一、纯函数 ━━━");
const {
  buildQueryOrderBody,
  mapOrderStatusToAction,
  shouldRunReconcile,
  PENDING_MIN_AGE_MS,
  RECONCILE_THROTTLE_MS,
} = await import("../core/wxpay/query.core.ts");
const { computePaySig } = await import("../core/wxpay/signature.ts");

const body = buildQueryOrderBody("oUSER1", "YR20261002153045ABC234");
assert(
  body === '{"openid":"oUSER1","env":0,"order_id":"YR20261002153045ABC234"}',
  "查单请求体固定键序 openid→env→order_id",
);
assert(
  mapOrderStatusToAction(2) === "DELIVER" &&
    mapOrderStatusToAction(3) === "DELIVER" &&
    mapOrderStatusToAction(4) === "DELIVER",
  "2/3/4（已支付/发货中/已发货）→ 补发货",
);
assert(
  mapOrderStatusToAction(5) === "REFUND_MARK" &&
    mapOrderStatusToAction(8) === "REFUND_MARK",
  "5/8 退款 → REFUND_MARK",
);
assert(mapOrderStatusToAction(6) === "CLOSE", "6 已关闭 → CLOSE");
assert(
  mapOrderStatusToAction(0) === "WAIT" && mapOrderStatusToAction(1) === "WAIT",
  "0/1 未支付 → WAIT（留 PENDING）",
);
assert(mapOrderStatusToAction(99) === "UNKNOWN", "未知状态 → UNKNOWN");
assert(shouldRunReconcile(null, 0), "首次触发放行");
assert(
  !shouldRunReconcile(Date.now() - 1000, Date.now()) &&
    shouldRunReconcile(Date.now() - RECONCILE_THROTTLE_MS - 1, Date.now()),
  `节流判定（${RECONCILE_THROTTLE_MS / 60000} 分钟窗口）`,
);
assert(
  PENDING_MIN_AGE_MS === 2 * 60 * 1000,
  "PENDING 最小年龄 2 分钟（给推送留窗）",
);

console.log("━━━ 二、access_token 缓存（mock 全局 fetch） ━━━");
const PRISMA_STUB =
  "data:text/javascript,export default new Proxy({}, { get: (_, k) => globalThis.__PRISMA_DB ? globalThis.__PRISMA_DB[k] : undefined });";
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/prisma") {
      return { url: PRISMA_STUB, shortCircuit: true };
    }
    if (specifier.startsWith("@/core/")) {
      return {
        url: new URL(
          "../core/" + specifier.slice("@/core/".length) + ".ts",
          import.meta.url,
        ).href,
        shortCircuit: true,
      };
    }
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (
        specifier.startsWith("./") &&
        context.parentURL &&
        context.parentURL.endsWith(".ts")
      ) {
        return nextResolve(specifier + ".ts", context);
      }
      throw err;
    }
  },
});

process.env.WXPAY_APPID = "wx-test";
process.env.WXPAY_APP_SECRET = "sec";
process.env.WXPAY_OFFER_ID = "offer";
process.env.WXPAY_APP_KEY = "appkey-x";

const realFetch = globalThis.fetch;
let tokenFetchCount = 0;
globalThis.fetch = async (url) => {
  if (String(url).includes("cgi-bin/token")) {
    tokenFetchCount += 1;
    return {
      ok: true,
      json: async () => ({ access_token: "TOK-1", expires_in: 7200 }),
    };
  }
  throw new Error("unexpected fetch: " + url);
};
const { getWxAccessToken, _resetTokenCache } = await import(
  "../core/wxpay/access-token.ts"
);
_resetTokenCache();
assert(
  (await getWxAccessToken()) === "TOK-1" && tokenFetchCount === 1,
  "首次获取 token",
);
assert(
  (await getWxAccessToken()) === "TOK-1" && tokenFetchCount === 1,
  "缓存命中不重取",
);
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ access_token: "TOK-2", expires_in: 7200 }),
});
assert((await getWxAccessToken(true)) === "TOK-2", "force 强制刷新");

console.log("━━━ 三、runReconcile 全仿真 ━━━");
const { WxpayReconcileService } = await import(
  "../core/wxpay/reconcile.service.ts"
);

const old = (min) => new Date(Date.now() - (min + 3) * 60 * 1000); // 超过 PENDING 窗口
const mkOrder = (orderid, outTradeNo, over = {}) => ({
  orderid,
  outTradeNo,
  wxOrderId: null,
  userid: "user-1",
  planKey: "YEARLY",
  productId: "yuanlu_yearly",
  buyQuantity: 2,
  amountFen: 33600,
  daysGranted: 0,
  status: "PENDING",
  createAt: old(10),
  ...over,
});

// query_order mock：按 outTradeNo 返回不同状态
const queryCalls = [];
const queryFetch = async (url, opts) => {
  queryCalls.push({ url: String(url), body: opts?.body });
  const outTradeNo = JSON.parse(opts.body).order_id;
  const resp = {
    "YR-PAID": {
      errcode: 0,
      order: {
        status: 2,
        paid_fee: 33600,
        channel_order_id: "mch-1",
        wxpay_order_id: "txn-1",
        paid_time: 1790000001,
      },
    },
    "YR-UNPAID": { errcode: 0, order: { status: 1 } },
    "YR-CLOSED": { errcode: 0, order: { status: 6 } },
    "YR-ERR": { errcode: 268490003, errmsg: "签名错误" },
  }[outTradeNo] ?? { errcode: -1, errmsg: "no such order" };
  return { ok: true, json: async () => resp };
};

function makeMockDb(seed) {
  const tx = {
    wxpayOrder: {
      findUnique: async ({ where }) => {
        if (where.wxOrderId)
          return (
            seed.orders.find((o) => o.wxOrderId === where.wxOrderId) || null
          );
        return (
          seed.orders.find((o) => o.outTradeNo === where.outTradeNo) || null
        );
      },
      findMany: async ({ where }) =>
        seed.orders.filter(
          (o) => o.status === "PENDING" && o.createAt < where.createAt.lt,
        ),
      update: async ({ where, data }) => {
        const o = seed.orders.find((x) => x.orderid === where.orderid);
        Object.assign(o, data);
        return o;
      },
    },
    user: {
      findUnique: async ({ where }) =>
        seed.users.find((u) => u.userid === where.userid) || null,
    },
    subscriptions: {
      findFirst: async () => seed.activeSub || null,
      update: async ({ where, data }) => {
        seed.activeSub.endDate = data.endDate;
        return seed.activeSub;
      },
      create: async ({ data }) => {
        seed.activeSub = data;
        return data;
      },
    },
  };
  return { ...tx, $transaction: async (fn) => fn(tx) };
}

let seed = {
  orders: [
    mkOrder(1, "YR-PAID"),
    mkOrder(2, "YR-UNPAID"),
    mkOrder(3, "YR-CLOSED"),
    mkOrder(4, "YR-ERR"),
  ],
  users: [{ userid: "user-1", wxOpenId: "oUSER1" }],
  activeSub: null,
};
globalThis.__PRISMA_DB = makeMockDb(seed);
let s = await WxpayReconcileService.runReconcile(queryFetch);
assert(s.checked === 4, "四笔 PENDING 全查");
assert(s.delivered === 1, "已支付单补发货（handleDeliver 共用管道）");
const paid = seed.orders.find((o) => o.outTradeNo === "YR-PAID");
assert(
  paid.status === "ACTIVATED" &&
    paid.wxOrderId === "mch-1" &&
    paid.daysGranted === 730,
  "补发货终态：ACTIVATED+回填 wxOrderId+730 天",
);
assert(
  seed.activeSub && seed.activeSub.subscriptionType === "PREMIUM",
  "订阅建行（共享续期管道）",
);
assert(
  seed.orders.find((o) => o.outTradeNo === "YR-UNPAID").status === "PENDING",
  "未支付留 PENDING（WAIT）",
);
assert(
  seed.orders.find((o) => o.outTradeNo === "YR-CLOSED").status === "CLOSED",
  "已关闭单置 CLOSED",
);
assert(
  s.waiting === 1 && s.closed === 1 && s.skipped === 1,
  "统计计数 waiting/closed/skipped",
);

// 请求签名可复算：URL 含 access_token + pay_sig=对 body 的 uri+'&'+body 验算
const call = queryCalls[0];
const expectedSig = computePaySig("appkey-x", "/xpay/query_order", call.body);
assert(
  call.url.includes("access_token=TOK-2") &&
    call.url.includes("pay_sig=" + expectedSig),
  "query_order URL 携 access_token+pay_sig（与请求体逐字节可复算）",
);

// 二次轮跑：已终态订单不再进 findMany（PENDING 过滤=定时幂等）；
// 接口失败单（YR-ERR）与未支付单保持 PENDING 留待下轮重试
s = await WxpayReconcileService.runReconcile(queryFetch);
assert(
  s.checked === 2 && s.delivered === 0 && s.waiting === 1 && s.skipped === 1,
  "二轮仅剩未支付+接口失败单（终态不再处理——定时幂等，失败单可重试）",
);

// 无绑定用户 → skipped
seed = {
  orders: [mkOrder(9, "YR-PAID")],
  users: [{ userid: "user-1", wxOpenId: null }],
  activeSub: null,
};
globalThis.__PRISMA_DB = makeMockDb(seed);
s = await WxpayReconcileService.runReconcile(queryFetch);
assert(s.checked === 1 && s.skipped === 1, "openid 缺失跳过（不盲查）");

globalThis.fetch = realFetch;

console.log("----------------------------------------");
if (failed === 0) {
  console.log("ALL WXPAY-RECONCILE TESTS PASSED");
} else {
  console.log(failed + " TEST(S) FAILED");
  process.exit(1);
}
