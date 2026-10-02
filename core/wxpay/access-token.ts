/**
 * core/wxpay/access-token.ts — 小程序接口调用凭据管理（模块 E T4.5）
 *
 * query_order 等服务端 /xpay/* 接口需 access_token（auth.getAccessToken：
 * appid+secret 换取，有效期 7200s）。模块级缓存 + 提前 5 分钟刷新；
 * 并发去重（在途共享同一 Promise）。与 T3.2 的 code2Session 凭据同源
 * （WXPAY_APPID/WXPAY_APP_SECRET）。
 */
import { readWxpayConfig } from "./config";

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cache: TokenCache | null = null;
let pending: Promise<string> | null = null;

/** 获取（或复用）有效 access_token；force 强制刷新 */
export async function getWxAccessToken(force = false): Promise<string> {
  const now = Date.now();
  if (!force && cache && cache.expiresAt - 5 * 60 * 1000 > now) {
    return cache.token;
  }
  if (pending) return pending;

  const { appid, appSecret } = readWxpayConfig();
  const url =
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential` +
    `&appid=${appid}&secret=${appSecret}`;

  pending = fetch(url)
    .then((res) => {
      if (!res.ok)
        throw new Error(`access_token 获取失败（HTTP ${res.status}）`);
      return res.json() as Promise<{
        access_token?: string;
        expires_in?: number;
        errcode?: number;
        errmsg?: string;
      }>;
    })
    .then((data) => {
      if (!data.access_token || data.errcode) {
        throw new Error(
          `access_token 获取失败（${data.errcode ?? "EMPTY"}）：${data.errmsg ?? "未返回 token"}`,
        );
      }
      cache = {
        token: data.access_token,
        expiresAt: now + (data.expires_in ?? 7200) * 1000,
      };
      return cache.token;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** 单测隔离：清空缓存与在途请求 */
export function _resetTokenCache(): void {
  cache = null;
  pending = null;
}
