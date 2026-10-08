/**
 * IP 归一化工具
 *
 * Node 双栈监听时，x-forwarded-for 里可能出现 IPv4 映射的 IPv6 形式
 * （如 ::ffff:192.168.1.9，库里已有上万行历史数据）。ip2region 只接受
 * 点分 IPv4，未归一化会导致 search() 抛错；同时同一访客以两种形式存储
 * 会在按 IP 去重时被计两次。入库（logVisit）与展示（getLocation、热力图
 * 聚合 SQL）统一先归一化。
 */

/** 将 IPv4 映射的 IPv6（::ffff:a.b.c.d）归一化为点分 IPv4，其余原样返回 */
export function normalizeIp(ip: string): string {
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

/**
 * 从请求头提取客户端 IP（入库 registerIp 用，User.registerIp 为 VarChar(45)）。
 *
 * x-forwarded-for 经 CDN/反向代理是逗号分隔的整条链，移动网络下客户端是
 * IPv6（单段最长即 45 字符），整链入库必然超出列宽——曾导致手机验证码
 * 登录自动建号时 Prisma P2000（"value too long for varying(45)"）整单失败。
 * 只取链上第一段（即最原始客户端），归一化后仍按 45 截断兜底。
 */
export function extractClientIp(
  getHeader: (name: string) => string | null | undefined,
): string {
  const forwardedFor = getHeader("x-forwarded-for");
  const first = forwardedFor?.split(",")[0]?.trim();
  const raw = first || getHeader("x-real-ip")?.trim() || "unknown";
  return normalizeIp(raw).slice(0, 45);
}
