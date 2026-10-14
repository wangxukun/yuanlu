// core/wx/wxacode.service.ts — 小程序码生成（公众号联动 T1）
//
// 服务器端调用微信开放接口（出口 IP 已在小程序后台白名单内）：
//   1. GET  /cgi-bin/token            换取小程序 access_token（模块级缓存，
//      提前 20 分钟刷新；进程内单副本假设——当前单实例部署够用）
//   2. POST /wxa/getwxacodeunlimit    生成带 scene 短码的小程序码（不限量），
//      成功返回 image/jpeg 二进制，失败返回 JSON { errcode, errmsg }
//
// 凭据复用虚拟支付时期的 WXPAY_APPID / WXPAY_APP_SECRET（即小程序 appid/secret，
// 与 core/auth/wx-auth.service.ts 的 code2Session 同源）。

const WX_APPID = process.env.WXPAY_APPID;
const WX_APP_SECRET = process.env.WXPAY_APP_SECRET;

const TOKEN_URL = "https://api.weixin.qq.com/cgi-bin/token";
const CODE_URL = "https://api.weixin.qq.com/wxa/getwxacodeunlimit";

// access_token 提前 1200s 视为过期，避免边界失效
const TOKEN_REFRESH_MARGIN_MS = 1200 * 1000;

let cachedToken: { value: string; expiresAt: number } | null = null;

export interface WxacodeOptions {
  /** 落地页（小程序内页面路径，不带 .html；缺省用小程序首页） */
  page?: string;
  /** release（默认）| trial | develop——小程序未发布线上版时用 trial 自测 */
  envVersion?: "release" | "trial" | "develop";
  /** 码图边长 px，默认 430（与后台工具生成的一致） */
  width?: number;
}

function requireCredentials(): { appid: string; secret: string } {
  if (!WX_APPID || !WX_APP_SECRET) {
    throw new Error("微信小程序凭据缺失（WXPAY_APPID / WXPAY_APP_SECRET）");
  }
  return { appid: WX_APPID, secret: WX_APP_SECRET };
}

async function fetchAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }
  const { appid, secret } = requireCredentials();
  const res = await fetch(
    `${TOKEN_URL}?grant_type=client_credential&appid=${appid}&secret=${secret}`,
  );
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    errcode?: number;
    errmsg?: string;
  };
  if (!data.access_token) {
    // 40164 = IP 不在白名单（部署环境变化时最先排查）
    throw new Error(
      `获取 access_token 失败: ${data.errcode} ${data.errmsg ?? ""}`,
    );
  }
  cachedToken = {
    value: data.access_token,
    expiresAt:
      Date.now() + (data.expires_in ?? 7200) * 1000 - TOKEN_REFRESH_MARGIN_MS,
  };
  return cachedToken.value;
}

/**
 * 生成带 scene 短码的小程序码图片。
 * 40001（token 失效）自动强刷一次重试；其余错误直接抛出（含微信 errcode/errmsg）。
 */
export async function generateWxacodeBuffer(
  scene: string,
  options: WxacodeOptions = {},
): Promise<Buffer> {
  const body = {
    scene,
    page: options.page,
    check_path: false,
    env_version: options.envVersion ?? "release",
    width: options.width ?? 430,
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await fetchAccessToken(attempt > 0);
    const res = await fetch(`${CODE_URL}?access_token=${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const contentType = res.headers.get("content-type") ?? "";

    if (contentType.includes("image/")) {
      return Buffer.from(await res.arrayBuffer());
    }

    const err = (await res.json()) as {
      errcode?: number;
      errmsg?: string;
    };
    // 仅 token 失效值得强刷重试，其余（41030 页面不存在 / 40097 scene 非法等）重试无意义
    if (err.errcode === 40001 && attempt === 0) continue;
    throw new Error(`生成小程序码失败: ${err.errcode} ${err.errmsg ?? ""}`);
  }
  throw new Error("生成小程序码失败: 重试次数用尽");
}
