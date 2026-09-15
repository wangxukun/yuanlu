/**
 * 会员展示角色的唯一派生规则（P1-2 抽取，供 auth.ts 会话同步、
 * getMobileSession、subscription/status 轮询接口三处共用）。
 *
 * 前提（P0-1 已落地）：role 字段只是展示缓存，会员资格的执行口径
 * 是 isPremiumUser 的"ADMIN 直通 + 有效订阅"。任何把 role 暴露给
 * 前端/移动端的地方，都必须经过本函数从订阅事实重新派生，
 * 避免各处自实现导致展示口径分叉。
 *
 * 判定与 guard.ts 的 hasActivePremiumSubscription 严格同口径：
 * endDate 必须存在且大于当前时间（null 视为无效，不给异常数据留终身通道）。
 */
export type DisplayRole = "ADMIN" | "PREMIUM" | "USER";

export function deriveDisplayRole(
  dbRole: string | null | undefined,
  latestPremiumEndDate: Date | null | undefined,
): DisplayRole {
  if (dbRole === "ADMIN") return "ADMIN";
  if (latestPremiumEndDate && latestPremiumEndDate.getTime() > Date.now()) {
    return "PREMIUM";
  }
  return "USER";
}
