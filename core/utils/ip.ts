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
