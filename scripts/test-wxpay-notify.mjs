/**
 * scripts/test-wxpay-notify.mjs — 推送链路仿真（模块 E T4.4 验收）
 *
 * 覆盖：XML 解析（CDATA/裸值/缺字段/未知事件）、验签（paySig 同款 body
 * 验算，大小写/逐字节/键敏感）、回执官方格式逐字、发货管道全仿真
 * （"@/lib/prisma" 经 resolve 钩子重定向到 data:URL Proxy 桩——内存表
 * 模拟 wxpay_orders/subscriptions）：正常发货/重放幂等/对账拦截/无单/
 * 退款入账。
 * 运行：node scripts/test-wxpay-notify.mjs（yuanlu 仓；不挂 weapp 测试链）
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

const APP_KEY = "test-appkey";
const URI = "/api/wxpay/notify";

const DELIVER_XML = [
  "<xml>",
  "<ToUserName><![CDATA[gh_yuanlu]]></ToUserName>",
  "<FromUserName><![CDATA[official-openid]]></FromUserName>",
  "<CreateTime>1790000000</CreateTime>",
  "<MsgType><![CDATA[event]]></MsgType>",
  "<Event><![CDATA[xpay_goods_deliver_notify]]></Event>",
  "<OpenId><![CDATA[oUSER1]]></OpenId>",
  "<OutTradeNo><![CDATA[YR20261002153045ABC234]]></OutTradeNo>",
  "<Env>0</Env>",
  "<WeChatPayInfo>",
  "<MchOrderNo><![CDATA[wx-mch-0001]]></MchOrderNo>",
  "<TransactionId><![CDATA[wx-txn-0001]]></TransactionId>",
  "<PaidTime>1790000001</PaidTime>",
  "</WeChatPayInfo>",
  "<GoodsInfo>",
  "<ProductId><![CDATA[yuanlu_yearly]]></ProductId>",
  "<Quantity>2</Quantity>",
  "<OrigPrice>16800</OrigPrice>",
  "<ActualPrice>33600</ActualPrice>",
  "<Attach><![CDATA[user-1]]></Attach>",
  "</GoodsInfo>",
  "</xml>",
].join("");

console.log("━━━ 一、XML 解析 ━━━");
const {
  parseNotify,
  extractTag,
  ackResponse,
  nackResponse,
  verifyNotifySignature,
  verifyMessagePushSignature,
} = await import("../core/wxpay/notify.core.ts");
const { computePaySig } = await import("../core/wxpay/signature.ts");

const deliver = parseNotify(DELIVER_XML);
assert(deliver.event === "xpay_goods_deliver_notify", "发货事件识别");
assert(
  deliver.outTradeNo === "YR20261002153045ABC234" &&
    deliver.mchOrderNo === "wx-mch-0001" &&
    deliver.openid === "oUSER1",
  "关键字段解析（CDATA 剥壳）",
);
assert(
  deliver.quantity === 2 &&
    deliver.actualPriceFen === 33600 &&
    deliver.paidTime === 1790000001 &&
    deliver.env === 0,
  "数字字段解析（裸值）",
);
assert(extractTag(DELIVER_XML, "NotExist") === null, "缺失标签返回 null");
const broken = parseNotify(
  DELIVER_XML.replace(
    "<OutTradeNo><![CDATA[YR20261002153045ABC234]]></OutTradeNo>",
    "",
  ),
);
assert(broken.event === null, "缺 OutTradeNo 拒解析（event=null）");
const unknown = parseNotify(
  DELIVER_XML.replace("xpay_goods_deliver_notify", "xpay_future_event"),
);
assert(
  unknown.event === null && unknown.rawEvent === "xpay_future_event",
  "未知事件分流（rawEvent 保留）",
);

const REFUND_XML = DELIVER_XML.replace(
  "xpay_goods_deliver_notify",
  "xpay_refund_notify",
)
  .replace(
    /<WeChatPayInfo>[\s\S]*?<\/WeChatPayInfo>/,
    "<WxRefundId><![CDATA[rf-1]]></WxRefundId>",
  )
  .replace(
    /<GoodsInfo>[\s\S]*?<\/GoodsInfo>/,
    "<MchOrderId><![CDATA[YR20261002153045ABC234]]></MchOrderId>" +
      "<WxOrderId><![CDATA[wx-mch-0001]]></WxOrderId>" +
      "<RefundFee>33600</RefundFee><RetCode>0</RetCode>",
  );
const refund = parseNotify(REFUND_XML);
assert(
  refund.event === "xpay_refund_notify" &&
    refund.mchOrderId === "YR20261002153045ABC234" &&
    refund.retCode === 0 &&
    refund.refundFeeFen === 33600,
  "退款事件解析（单号/金额/结果）",
);

console.log("━━━ 二、验签 ━━━");
const goodSig = computePaySig(APP_KEY, URI, DELIVER_XML);
assert(
  verifyNotifySignature({
    appKey: APP_KEY,
    uri: URI,
    rawBody: DELIVER_XML,
    paySigHeader: goodSig,
  }),
  "正确 paySig 通过（大小写不敏感）",
);
assert(
  verifyNotifySignature({
    appKey: APP_KEY,
    uri: URI,
    rawBody: DELIVER_XML,
    paySigHeader: goodSig.toUpperCase(),
  }),
  "大写签名头同样通过",
);
assert(
  !verifyNotifySignature({
    appKey: APP_KEY,
    uri: URI,
    rawBody: DELIVER_XML,
    paySigHeader: null,
  }),
  "头缺失拒绝",
);
assert(
  !verifyNotifySignature({
    appKey: APP_KEY,
    uri: URI,
    rawBody: DELIVER_XML + " ",
    paySigHeader: goodSig,
  }),
  "body 逐字节敏感（篡改拒绝）",
);
assert(
  !verifyNotifySignature({
    appKey: "other-key",
    uri: URI,
    rawBody: DELIVER_XML,
    paySigHeader: goodSig,
  }),
  "appKey 不匹配拒绝",
);
assert(
  !verifyNotifySignature({
    appKey: APP_KEY,
    uri: "/api/other",
    rawBody: DELIVER_XML,
    paySigHeader: goodSig,
  }),
  "uri 参与验签",
);

console.log("━━━ 二之二、通用消息推送验签（T5.4 真机联调落地） ━━━");
// 官方向量：SHA1(sort([token,timestamp,nonce]).join(''))（公众号/小程序消息推送同款）
assert(
  verifyMessagePushSignature({
    token: "yuanlu_test",
    timestamp: "1700000000",
    nonce: "abc123",
    signature: "aba976c08ed274ad1630d93b18f23c54e74da34f",
  }),
  "官方口径向量通过（排序后拼接 SHA1）",
);
assert(
  !verifyMessagePushSignature({
    token: "yuanlu_test",
    timestamp: "1700000001",
    nonce: "abc123",
    signature: "aba976c08ed274ad1630d93b18f23c54e74da34f",
  }),
  "timestamp 参与验签（篡改拒绝）",
);
assert(
  !verifyMessagePushSignature({
    token: "other",
    timestamp: "1700000000",
    nonce: "abc123",
    signature: "aba976c08ed274ad1630d93b18f23c54e74da34f",
  }),
  "token 不匹配拒绝",
);
assert(
  !verifyMessagePushSignature({
    token: "",
    timestamp: "1",
    nonce: "n",
    signature: "x",
  }),
  "token 未配置（空串）拒绝——GET 握手同理 403",
);

console.log("━━━ 三、回执格式 ━━━");
assert(
  ackResponse() ===
    "<xml><ErrCode>0</ErrCode><ErrMsg><![CDATA[success]]></ErrMsg></xml>",
  "成功回执官方格式逐字",
);
assert(
  nackResponse("boom").includes("<ErrCode>1</ErrCode>") &&
    nackResponse("boom").includes("boom"),
  "失败回执非 0 + ErrMsg",
);
assert(
  !nackResponse("evil]]>inject").includes("evil]]>inject"),
  "ErrMsg CDATA 注入转义",
);

console.log("━━━ 四、发货管道（mock prisma） ━━━");
// resolve 钩子：@/lib/prisma → data:URL Proxy 桩；@/core/* 别名 → 真实
// .ts；TS 风格无扩展名相对导入（.ts 父模块）补 .ts 重试（Node 直跑仿真）
const PRISMA_STUB =
  "data:text/javascript,export default new Proxy({}, { get: (_, k) => globalThis.__PRISMA_DB ? globalThis.__PRISMA_DB[k] : undefined });";
// registerHooks（Node ≥22.15 同步内联钩子；register() 只认 loader 文件路径）
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
const { WxpayNotifyService } = await import("../core/wxpay/notify.service.ts");

function makeMockDb(seed) {
  const tx = {
    wxpayOrder: {
      findUnique: async ({ where }) => {
        if (where.wxOrderId) {
          return (
            seed.orders.find((o) => o.wxOrderId === where.wxOrderId) || null
          );
        }
        return (
          seed.orders.find((o) => o.outTradeNo === where.outTradeNo) || null
        );
      },
      update: async ({ where, data }) => {
        const o = seed.orders.find((x) => x.orderid === where.orderid);
        Object.assign(o, data);
        return o;
      },
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
  // handleDeliver 走 $transaction(tx)，handleRefund 直用顶层 prisma.* ——两层同实现
  return { ...tx, $transaction: async (fn) => fn(tx) };
}

const ORDER = {
  orderid: 1,
  outTradeNo: "YR20261002153045ABC234",
  wxOrderId: null,
  userid: "user-1",
  planKey: "YEARLY",
  productId: "yuanlu_yearly",
  buyQuantity: 2,
  amountFen: 33600,
  daysGranted: 0,
  status: "PENDING",
};

// 4.1 正常发货：续期 730 天 + 订单终态
let seed = { orders: [{ ...ORDER }], activeSub: null };
globalThis.__PRISMA_DB = makeMockDb(seed);
let out = await WxpayNotifyService.handleDeliver(deliver);
assert(out.kind === "OK", "正常发货 OK");
assert(
  seed.orders[0].status === "ACTIVATED" &&
    seed.orders[0].wxOrderId === "wx-mch-0001",
  "订单置 ACTIVATED + 回填 wxOrderId",
);
assert(seed.orders[0].daysGranted === 730, "天数=365×2 份（SKU×Quantity）");
assert(
  seed.activeSub &&
    seed.activeSub.userid === "user-1" &&
    seed.activeSub.subscriptionType === "PREMIUM",
  "新建 PREMIUM 订阅行（extendPremiumSubscription 共享管道口径）",
);

// 4.2 重放幂等：同 mchOrderNo 再推 → DUPLICATED，不再续期
const daysBefore = seed.orders[0].daysGranted;
out = await WxpayNotifyService.handleDeliver(deliver);
assert(out.kind === "DUPLICATED", "同 wxOrderId 重放 → DUPLICATED");
assert(seed.orders[0].daysGranted === daysBefore, "重放不重复加时（幂等闸门）");

// 4.3 对账不一致：订单金额被篡改 → AMOUNT_MISMATCH 不发货
seed = {
  orders: [{ ...ORDER, outTradeNo: "YR20261002153046XYZ567", amountFen: 1 }],
  activeSub: null,
};
globalThis.__PRISMA_DB = makeMockDb(seed);
out = await WxpayNotifyService.handleDeliver({
  ...deliver,
  outTradeNo: "YR20261002153046XYZ567",
});
assert(
  out.kind === "MISMATCH" && seed.orders[0].status === "AMOUNT_MISMATCH",
  "金额不符 → AMOUNT_MISMATCH 入账转人工",
);
assert(!seed.activeSub, "对账失败不发货");

// 4.4 订单不存在
seed = { orders: [], activeSub: null };
globalThis.__PRISMA_DB = makeMockDb(seed);
out = await WxpayNotifyService.handleDeliver({
  ...deliver,
  outTradeNo: "YR20261002153047ZZZ999",
});
assert(
  out.kind === "ORDER_NOT_FOUND",
  "无单 → ORDER_NOT_FOUND（路由回非 0 交重试）",
);

console.log("━━━ 五、退款入账（mock） ━━━");
seed = { orders: [{ ...ORDER, status: "ACTIVATED" }], activeSub: null };
globalThis.__PRISMA_DB = makeMockDb(seed);
await WxpayNotifyService.handleRefund(refund);
assert(
  seed.orders[0].status === "REFUNDED",
  "退款订单置 REFUNDED（仅记录，不动订阅）",
);

console.log("----------------------------------------");
if (failed === 0) {
  console.log("ALL WXPAY-NOTIFY TESTS PASSED");
} else {
  console.log(failed + " TEST(S) FAILED");
  process.exit(1);
}
