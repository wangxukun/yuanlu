/**
 * core/auth/wx-bind.core.ts — 微信身份绑定纯逻辑（模块 E T3.2）
 *
 * 零依赖纯函数：code2Session 响应解析与绑定决策矩阵，
 * 供 WxAuthService 组合 IO 使用；Node 脚本（scripts/test-wx-bind.mjs）
 * 直接 import 做行为仿真（yuanlu 无测试基建，类型门禁走 tsc --noEmit）。
 */

/** 微信 code2Session 原始响应（成功含 openid/session_key，失败含 errcode/errmsg） */
export interface WxCode2SessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

export interface WxSession {
  openid: string;
  sessionKey: string;
}

/**
 * 解析 code2Session 响应。code 一次性且 5 分钟有效，常见失败：
 * 40029 无效 code / 40163 已使用 / 45011 频率限制 / -1 系统繁忙。
 * 文案口径：带 errcode 原因透出，便于小程序端 toast 与排障。
 */
export function parseCode2Session(data: WxCode2SessionResponse): WxSession {
  if (data.errcode || !data.openid || !data.session_key) {
    throw new Error(
      `微信登录失败（${data.errcode ?? "EMPTY"}）：${data.errmsg ?? "未返回 openid"}`,
    );
  }
  return { openid: data.openid, sessionKey: data.session_key };
}

export type WxBindDecision =
  | "CREATE" // 未绑定 → 首次绑定
  | "REFRESH" // 已绑定同一 openid → 幂等成功（仅刷新 sessionKey，即签即用）
  | "REJECT_OWNER" // openid 已被其他账号占用 → 拒绝（与唯一索引双保险）
  | "REJECT_SWAP"; // 当前账号已绑定其他 openid → 拒绝（换单绑需先解绑）

/**
 * 绑定决策矩阵（openid=本次 code2Session 得到的 openid；
 * currentOpenId=当前用户行上的 wxOpenId；ownerUserid=该 openid 已绑定的
 * 账号 userid，null=未被占用）。一对一口径：一个微信号仅绑一个自建账号
 * （防一号多绑套权益），一个账号也仅持一个微信号（换单绑须走解绑流程，本期不提供）。
 */
export function decideWxBind(
  openid: string,
  currentOpenId: string | null,
  ownerUserid: string | null,
  userid: string,
): WxBindDecision {
  if (ownerUserid && ownerUserid !== userid) return "REJECT_OWNER";
  if (currentOpenId) {
    return currentOpenId === openid ? "REFRESH" : "REJECT_SWAP";
  }
  return "CREATE";
}

/** 决策 → 用户可读文案（REJECT 类 throw 用；CREATE/REFRESH 走更新） */
export const WX_BIND_MESSAGES: Record<WxBindDecision, string> = {
  CREATE: "微信账号绑定成功",
  REFRESH: "微信账号绑定成功",
  REJECT_OWNER: "该微信号已绑定其他账号",
  REJECT_SWAP: "当前账号已绑定其他微信号，请先解绑后更换",
};
