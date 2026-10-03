/**
 * core/security/msg-sec-check.core.ts — UGC 文本内容安全检测纯逻辑
 *
 * 微信 security.msgSecCheck（POST /wxa/msg_sec_check）：
 *   - v2：{ content, version: 2, scene, openid } → { result: { suggest, label } }，
 *     suggest ∈ pass / review / risky；openid 必填（用户近两小时访问过小程序时画像最准）。
 *   - v1 兼容：{ content } → errcode 0=通过 / 87014=违规（老协议，无 suggest）。
 * 本项目自建账号体系：仅购买前走过微信绑定（T3.1 即签即用）的用户才有
 * User.wxOpenId，有则 v2（精确到用户风险画像），无则降级 v1——两条路都要拦得住。
 *
 * scene 枚举（官方）：1=资料 2=评论 3=论坛 4=社交日志。
 * 拒绝口径：v2 非 pass（review/risky）一律拒、v1 87014 拒——合规优先，
 * 评论区误杀用户可改写重发，成本可控。
 */

/** 检测场景（微信官方 msg_sec_check scene 枚举） */
export const SEC_SCENE = {
  /** 资料类：昵称等 */
  PROFILE: 1,
  /** 评论类 */
  COMMENT: 2,
} as const;

export interface SecCheckBodyInput {
  content: string;
  /** 用户在小程序内的 openid；有则走 v2，无则 v1 兼容 */
  openid?: string | null;
  scene?: number;
}

/** 构建请求体：有 openid → v2（scene+openid 风险画像）；无 → v1 兼容（仅 content） */
export function buildSecCheckBody({
  content,
  openid,
  scene,
}: SecCheckBodyInput): Record<string, unknown> {
  return openid
    ? {
        content,
        version: 2,
        scene: scene ?? SEC_SCENE.COMMENT,
        openid,
      }
    : { content };
}

export type SecCheckVerdict =
  | { kind: "pass" }
  | { kind: "reject"; suggest: string; label: number }
  | { kind: "error"; errcode: number; errmsg?: string };

/** access_token 失效类 errcode（40001=凭据无效 / 42001=已过期）：强刷后重试一次 */
export const TOKEN_RETRY_ERRCODES: ReadonlySet<number> = new Set([
  40001, 42001,
]);

/**
 * 解析 msg_sec_check 响应，归一为三态 verdict：
 *   v2：errcode=0 → result.suggest（无 result 字段按通过，空响应 fail-open 同口径）
 *   v1：errcode=0 → 通过；87014 → 违规（归一 reject/risky）
 *   其余 errcode → error（调用方决定重试或放行）
 */
export function parseSecCheckResponse(body: unknown): SecCheckVerdict {
  const data = (body ?? {}) as {
    errcode?: number;
    errmsg?: string;
    result?: { suggest?: string; label?: number };
  };
  const errcode = typeof data.errcode === "number" ? data.errcode : 0;

  if (errcode === 0) {
    if (data.result && typeof data.result.suggest === "string") {
      if (data.result.suggest === "pass") return { kind: "pass" };
      return {
        kind: "reject",
        suggest: data.result.suggest,
        label: typeof data.result.label === "number" ? data.result.label : 0,
      };
    }
    return { kind: "pass" };
  }

  if (errcode === 87014) {
    return { kind: "reject", suggest: "risky", label: 0 };
  }

  return { kind: "error", errcode, errmsg: data.errmsg };
}
