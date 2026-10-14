// core/utils/signup-source.ts — 注册来源归一化
//
// 客户端（小程序/网页）在建号请求里可携带 signupSource（启动来源，
// 如小程序码 scene=gzh_follow、路径参数 src=gzh_w1_b）。值完全由客户端
// 提供，落库前统一走本工具收紧到安全字符集，异常值一律按"无来源"处理。

const SOURCE_RE = /^[A-Za-z0-9_.-]{1,100}$/;

export function normalizeSignupSource(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return SOURCE_RE.test(trimmed) ? trimmed : undefined;
}
