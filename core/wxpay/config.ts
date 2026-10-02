/**
 * core/wxpay/config.ts — 微信虚拟支付运行时配置与 SKU 映射（模块 E T4.1）
 *
 * env 清单（.env 配置，不入库）：
 *   WXPAY_APPID / WXPAY_APP_SECRET   小程序本体凭据（code2Session，T3.2 已用）
 *   WXPAY_OFFER_ID                   虚拟支付-基本配置 OfferID
 *   WXPAY_APP_KEY                    虚拟支付-基本配置 现网 AppKey（paySig 签名）
 *   WXPAY_PRODUCT_ID_{KEY}           道具管理创建的四档商品 ID（MP 后台创建后回填）
 *
 * 口径：
 *   - 函数式读取（每次调用现读 process.env，运行时可变、单测可注入）；
 *   - 缺失项收集后一次性显式抛错（不静默——下单/推送链路宁可失败不可带病运行）；
 *   - 价格表分单位单源：与 lib/afdian-plans.ts 元单位 ×100 对齐
 *     （500/1800/4800/16800 分 = ¥5/¥18/¥48/¥168），两处改动须同步。
 */

export type WxpayPlanKey = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

/** 四档价格天数表（分单位；与 AFDIAN_PLANS 单源对齐红线，勿单侧改动） */
export const WXPAY_PRICE_TABLE: ReadonlyArray<{
  planKey: WxpayPlanKey;
  priceFen: number;
  days: number;
}> = [
  { planKey: "WEEKLY", priceFen: 500, days: 7 },
  { planKey: "MONTHLY", priceFen: 1800, days: 30 },
  { planKey: "QUARTERLY", priceFen: 4800, days: 90 },
  { planKey: "YEARLY", priceFen: 16800, days: 365 },
];

export interface WxpaySku {
  planKey: WxpayPlanKey;
  productId: string;
  priceFen: number;
  days: number;
}

export interface WxpayRuntimeConfig {
  appid: string;
  appSecret: string;
  offerId: string;
  appKey: string;
  /** productId 已回填的 SKU（缺道具配置的档位不出现——下单前置校验拦） */
  skus: Partial<Record<WxpayPlanKey, WxpaySku>>;
}

const ENV_KEYS = {
  appid: "WXPAY_APPID",
  appSecret: "WXPAY_APP_SECRET",
  offerId: "WXPAY_OFFER_ID",
  appKey: "WXPAY_APP_KEY",
} as const;

/**
 * 读取虚拟支付运行时配置。任一基础 env 缺失 → 抛出汇总错误（列出全部
 * 缺失键名）；道具 productId 缺失不在此抛（允许先配基础四件、道具分批
 * 回填），由 getWxpaySku / 下单接口按档位显式报错。
 */
export function readWxpayConfig(): WxpayRuntimeConfig {
  const missing: string[] = [];
  const values: Record<string, string> = {};
  for (const [field, envKey] of Object.entries(ENV_KEYS)) {
    const v = process.env[envKey];
    if (!v) missing.push(envKey);
    else values[field] = v;
  }
  if (missing.length > 0) {
    throw new Error(`微信虚拟支付配置缺失：${missing.join("、")}`);
  }

  const skus: Partial<Record<WxpayPlanKey, WxpaySku>> = {};
  for (const row of WXPAY_PRICE_TABLE) {
    const productId = process.env[`WXPAY_PRODUCT_ID_${row.planKey}`];
    if (productId) {
      skus[row.planKey] = { productId, ...row };
    }
  }

  return {
    appid: values.appid,
    appSecret: values.appSecret,
    offerId: values.offerId,
    appKey: values.appKey,
    skus,
  };
}

/** 单档 SKU 查询（下单接口用）：基础配置缺失 / 道具未回填均显式报错 */
export function getWxpaySku(planKey: string): WxpaySku {
  const row = WXPAY_PRICE_TABLE.find((r) => r.planKey === planKey);
  if (!row) {
    throw new Error(`未知订阅档位：${planKey}`);
  }
  const config = readWxpayConfig();
  const sku = config.skus[row.planKey];
  if (!sku) {
    throw new Error(
      `道具未配置：WXPAY_PRODUCT_ID_${row.planKey}（MP 后台道具管理创建后回填 .env）`,
    );
  }
  return sku;
}
