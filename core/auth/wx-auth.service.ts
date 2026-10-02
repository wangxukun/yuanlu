/**
 * core/auth/wx-auth.service.ts — 微信身份绑定服务（模块 E T3.2）
 *
 * wx.login code → code2Session（appid+secret 服务端直连，code 不经前端透传
 * secret）→ openid/sessionKey 写 User 行（T3.1 schema）：
 *   - openid 一对一绑定（决策矩阵见 wx-bind.core.ts，重复绑定幂等刷新
 *     sessionKey——即签即用，供下单接口签名取用，不依赖长效）；
 *   - sessionKey 不下发前端（signature 由后端签发，密钥不出服务端）。
 * 绑定后虚拟支付下单（T4.3）直接读行取 openid+sessionKey 组装 signData。
 */
import prisma from "@/lib/prisma";
import {
  parseCode2Session,
  decideWxBind,
  WX_BIND_MESSAGES,
} from "./wx-bind.core";

const WX_APPID = process.env.WXPAY_APPID;
const WX_APP_SECRET = process.env.WXPAY_APP_SECRET;

export class WxAuthService {
  /** wx.login code → openid + session_key（官方 jscode2session，code 一次性 5 分钟） */
  static async code2Session(jsCode: string) {
    if (!WX_APPID || !WX_APP_SECRET) {
      throw new Error("微信登录配置缺失（WXPAY_APPID / WXPAY_APP_SECRET）");
    }
    const url =
      `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}` +
      `&secret=${WX_APP_SECRET}&js_code=${encodeURIComponent(jsCode)}` +
      `&grant_type=authorization_code`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("微信登录服务暂不可用，请稍后重试");
    }
    return parseCode2Session(await res.json());
  }

  /** 绑定（或幂等刷新）当前登录用户的微信身份 */
  static async bindWx(userid: string, jsCode: string) {
    const { openid, sessionKey } = await this.code2Session(jsCode);

    const [user, owner] = await Promise.all([
      prisma.user.findUnique({
        where: { userid },
        select: { wxOpenId: true },
      }),
      prisma.user.findUnique({
        where: { wxOpenId: openid },
        select: { userid: true },
      }),
    ]);
    if (!user) {
      throw new Error("用户不存在");
    }

    const decision = decideWxBind(
      openid,
      user.wxOpenId,
      owner?.userid ?? null,
      userid,
    );
    if (decision === "REJECT_OWNER" || decision === "REJECT_SWAP") {
      throw new Error(WX_BIND_MESSAGES[decision]);
    }

    await prisma.user.update({
      where: { userid },
      data: { wxOpenId: openid, wxSessionKey: sessionKey },
    });

    return { decision, openid, sessionKey };
  }
}
