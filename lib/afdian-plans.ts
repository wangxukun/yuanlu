/**
 * 爱发电套餐白名单与会员时长发放规则（P0-2 / W4 防金额套利的单一数据源）。
 *
 * 规则：
 *   1. 会员时长只按 plan_id 发放——金额不再直接换算天数；
 *   2. 金额必须等于该套餐单价的整数倍（覆盖爱发电"多份购买"场景，如 3 份月卡
 *      = ¥54 = 90 天），否则按 AMOUNT_MISMATCH 入账 0 天、转人工核查，
 *      杜绝旧版 "¥1=1 天 / 自定义金额按比例换时长" 的套利通道；
 *   3. 无 plan_id 或不在白名单（自定义金额赞助）→ 只入账不加时长。
 *
 * plan_id 解析优先级：AFDIAN_PLAN_ID_*（服务端专用）→ VITE_AFDIAN_PLAN_ID_*
 * （现有 .env 键名）→ 兜底订阅页公开的默认套餐 ID（前端 bundle 本就可见，非机密）。
 * 注意：若日后在爱发电开启优惠券/折扣价，金额整数倍校验需同步调整。
 */
export type AfdianPlanKey = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface AfdianPlan {
  key: AfdianPlanKey;
  price: number; // 单份价格（元），与订阅页档位一致
  days: number; // 单份对应会员天数
}

export const AFDIAN_PLANS: AfdianPlan[] = [
  { key: "WEEKLY", price: 5, days: 7 },
  { key: "MONTHLY", price: 18, days: 30 },
  { key: "QUARTERLY", price: 48, days: 90 },
  { key: "YEARLY", price: 168, days: 365 },
];

const DEFAULT_PLAN_IDS: Record<AfdianPlanKey, string> = {
  WEEKLY: "2a5a71d0621611f1aea252540025c377",
  MONTHLY: "83afbe20380e11f1917552540025c377",
  QUARTERLY: "882e1e46380f11f1a8b252540025c377",
  YEARLY: "f8a295b2380f11f1b24a52540025c377",
};

function resolvePlanId(key: AfdianPlanKey): string {
  return (
    process.env[`AFDIAN_PLAN_ID_${key}`] ||
    process.env[`VITE_AFDIAN_PLAN_ID_${key}`] ||
    DEFAULT_PLAN_IDS[key]
  );
}

export type PlanGrantStatus =
  | "ACTIVATED"
  | "NON_PLAN_SPONSOR"
  | "AMOUNT_MISMATCH";

export interface PlanGrant {
  days: number;
  planKey: AfdianPlanKey | null;
  status: PlanGrantStatus;
}

/**
 * 按套餐白名单结算一次支付应发放的会员天数。
 * 任何拿不到明确套餐凭据（plan_id）或金额对不上的订单，一律 0 天入账待人工处理。
 */
export function resolvePlanGrant(
  planId: string | null | undefined,
  amount: number,
): PlanGrant {
  if (!planId) {
    return { days: 0, planKey: null, status: "NON_PLAN_SPONSOR" };
  }

  const plan = AFDIAN_PLANS.find((p) => resolvePlanId(p.key) === planId);
  if (!plan) {
    return { days: 0, planKey: null, status: "NON_PLAN_SPONSOR" };
  }

  const quantity = amount / plan.price;
  if (
    !Number.isFinite(quantity) ||
    quantity < 1 ||
    Math.abs(quantity - Math.round(quantity)) > 1e-9
  ) {
    return { days: 0, planKey: plan.key, status: "AMOUNT_MISMATCH" };
  }

  return {
    days: plan.days * Math.round(quantity),
    planKey: plan.key,
    status: "ACTIVATED",
  };
}
