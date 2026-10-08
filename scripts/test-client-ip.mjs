/**
 * scripts/test-client-ip.mjs — 客户端 IP 提取纯逻辑仿真
 *
 * 直测 core/utils/ip.ts 的 extractClientIp（Node ≥22 type stripping 直跑 .ts）。
 * 背景事故（2026-10-08 生产）：手机验证码登录自动建号时 registerIp 直接存了
 * 整条 x-forwarded-for 链（移动 5G 客户端是 IPv6），超出 VarChar(45) 触发
 * Prisma P2000，建号整单失败、小程序无法登录。
 * 运行：node scripts/test-client-ip.mjs（yuanlu 仓；不挂 weapp npm test 链）
 */
import { extractClientIp, normalizeIp } from "../core/utils/ip.ts";

let failed = 0;
function assert(cond, msg) {
  if (cond) {
    console.log("PASS:", msg);
  } else {
    console.error("FAIL:", msg);
    failed++;
  }
}

/** 便捷构造 headers getter */
const withHeaders = (map) => (name) => map[name] ?? null;

console.log("━━━ 一、x-forwarded-for 链只取首段 ━━━");
assert(
  extractClientIp(
    withHeaders({ "x-forwarded-for": "1.2.3.4, 10.0.0.1, 172.71.80.1" }),
  ) === "1.2.3.4",
  "IPv4 代理链取最原始客户端（含空格分隔）",
);

// 生产事故样本：移动 5G 客户端 IPv6 + CDN/内网代理追加
const ipv6Chain =
  "2409:8a55:8617:cd35:7d3a:1a2b:3c4d:5e6f, 10.0.8.11, 100.100.30.25";
const got = extractClientIp(withHeaders({ "x-forwarded-for": ipv6Chain }));
assert(
  got === "2409:8a55:8617:cd35:7d3a:1a2b:3c4d:5e6f",
  `IPv6 客户端 + 代理链取首段（实际「${got}」）`,
);
assert(got.length <= 45, "入库值不超 VarChar(45)（事故根因不再复现）");

console.log("━━━ 二、兜底顺序 x-forwarded-for → x-real-ip → unknown ━━━");
assert(
  extractClientIp(withHeaders({ "x-real-ip": "5.6.7.8" })) === "5.6.7.8",
  "无 XFF 时回落 x-real-ip",
);
assert(
  extractClientIp(withHeaders({})) === "unknown",
  "两者皆无时兜底 unknown",
);

console.log("━━━ 三、归一化与列宽截断 ━━━");
assert(
  extractClientIp(
    withHeaders({ "x-forwarded-for": "::ffff:192.168.1.9, 10.0.0.1" }),
  ) === "192.168.1.9",
  "IPv4 映射的 IPv6（::ffff:）归一化为点分 IPv4",
);
assert(
  normalizeIp("::abcd:1.2.3.4") === "::abcd:1.2.3.4",
  "非映射前缀原样返回",
);

// 最长合法 IPv6（IPv6 映射 IPv4 形式）恰好 45 字符，不得截断
const maxIpv6 = "ffff:ffff:ffff:ffff:ffff:ffff:255.255.255.255";
assert(maxIpv6.length === 45, "测试样本自身为 45 字符（构造校验）");
assert(
  extractClientIp(withHeaders({ "x-forwarded-for": maxIpv6 })) === maxIpv6,
  "45 字符 IPv6 完整保留不截断",
);

// 超长异常样本仍兜底截断，绝不超列宽
const hostile = "a".repeat(200);
const truncated = extractClientIp(withHeaders({ "x-forwarded-for": hostile }));
assert(
  truncated.length === 45,
  `超长异常值截断到 45（实际 ${truncated.length}）`,
);

console.log("━━━ 四、getter 返回 undefined/null 均安全 ━━━");
assert(
  extractClientIp(() => undefined) === "unknown",
  "getter 返回 undefined 不抛错",
);
assert(extractClientIp(() => null) === "unknown", "getter 返回 null 不抛错");

if (failed > 0) {
  console.error(`\n${failed} 个断言失败`);
  process.exit(1);
}
console.log("\n全部通过");
