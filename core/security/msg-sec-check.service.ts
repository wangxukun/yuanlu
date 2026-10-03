/**
 * core/security/msg-sec-check.service.ts — UGC 内容安全检测服务
 *
 * 在写入前调微信 security.msgSecCheck（access_token 与虚拟支付模块同源，
 * 复用 core/wxpay/access-token 的模块级缓存+并发去重）。消费方：
 *   - app/api/comment/create（scene=COMMENT，评论/回复文本）
 *   - app/api/user/profile 昵称更新（scene=PROFILE，评论区公开展示）
 *
 * 失败口径（fail-open）：检测通道自身异常（网络失败 / access_token 获取失败 /
 * 接口非预期 errcode）时放行并记 error 日志——内容安全服务抖动不打垮评论主链路，
 * 违规内容另有「举报 → 管理员通知」链路兜底；拒绝仅发生在明确的
 * pass 之外的 verdict（见 msg-sec-check.core 的拒绝口径）。
 * access_token 失效（40001/42001）例外：强刷凭据后重试一次再谈放行。
 */
import { getWxAccessToken } from "@/core/wxpay/access-token";
import {
  buildSecCheckBody,
  parseSecCheckResponse,
  SEC_SCENE,
  TOKEN_RETRY_ERRCODES,
} from "@/core/security/msg-sec-check.core";

const MSG_SEC_CHECK_URL = "https://api.weixin.qq.com/wxa/msg_sec_check";

export interface CheckTextOptions {
  /** 有则走 v2（用户风险画像）；User.wxOpenId，仅微信绑定过的账号有值 */
  openid?: string | null;
  scene?: number;
}

/** 依赖注入口（单测注入假 fetch / 假 token 源） */
export interface SecCheckDeps {
  getToken?: (force?: boolean) => Promise<string>;
  fetchImpl?: typeof fetch;
}

/**
 * 检测一段 UGC 文本。ok=false 时调用方应回 4xx 并透出 reason；
 * 任何检测通道异常都返回 ok=true（fail-open，见文件头）。
 */
export async function checkUserGeneratedText(
  content: string,
  { openid, scene }: CheckTextOptions = {},
  { getToken = getWxAccessToken, fetchImpl = fetch }: SecCheckDeps = {},
): Promise<{ ok: boolean; reason?: string }> {
  const body = JSON.stringify(
    buildSecCheckBody({ content, openid, scene: scene ?? SEC_SCENE.COMMENT }),
  );

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // 第二次尝试=凭据失效重试，强制刷新 access_token
      const token = await getToken(attempt > 0);
      const res = await fetchImpl(
        `${MSG_SEC_CHECK_URL}?access_token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        },
      );
      const verdict = parseSecCheckResponse(await res.json());

      if (verdict.kind === "pass") return { ok: true };
      if (verdict.kind === "reject") {
        return { ok: false, reason: "内容未通过安全检测，请修改后重试" };
      }
      // error：凭据失效且首轮 → 强刷重试；其余记日志放行（fail-open）
      if (TOKEN_RETRY_ERRCODES.has(verdict.errcode) && attempt === 0) continue;
      console.error(
        "[msg-sec-check] 检测服务异常，放行：",
        verdict.errcode,
        verdict.errmsg ?? "",
      );
      return { ok: true };
    } catch (e) {
      if (attempt > 0) {
        console.error("[msg-sec-check] 网络异常，放行：", (e as Error).message);
        return { ok: true };
      }
      // 首轮网络异常 → 再试一次
    }
  }
  return { ok: true };
}
