/**
 * 配置 OSS Bucket 的跟读录音生命周期规则（yuanlu/speech/ 前缀，N 天后自动删除）：
 *   npx tsx scripts/set-speech-lifecycle.ts --days=91          # dry-run：查看现有规则与计划变更
 *   npx tsx scripts/set-speech-lifecycle.ts --days=91 --apply  # 实际下发（合并保留其它前缀的规则）
 *
 * ⚠️ 权限约束：生命周期是 Bucket 级管理接口，只有 Bucket 属主账号可调用。
 * 应用 AK/SK 只有对象级权限（put/delete/sign/list），运行本脚本会报
 * AccessDenied "The bucket you access does not belong to you"（403）。两条出路：
 * 1. 由 Bucket 属主在阿里云控制台配置等价规则（当前已配置：
 *    前缀 yuanlu/speech/、最后修改时间 91 天后删除）；
 * 2. 用属主账号的 AK/SK 临时运行本脚本（环境变量优先于 .env，不会写入文件）：
 *    OSS_ACCESS_KEY_ID=... OSS_ACCESS_KEY_SECRET=... npx tsx scripts/set-speech-lifecycle.ts --days=91 --apply
 *
 * putBucketLifecycle 是整桶覆盖式写入，脚本会先读现有规则、仅替换 id 为
 * yuanlu-speech-expiry 的一条，其余原样带回；yuanlu/speech/ 前缀只含用户
 * 跟读录音与评测明细，不含剧集音频/字幕/封面，作用域安全。
 *
 * days 须比对账清理保留期（core/speech/speech-cleanup.service.ts，默认 90）
 * 大 1 天，确保 DB 引用先于对象删除被置空；调整任一侧时同步另一侧。
 */
import * as fs from "node:fs";
import type OSS from "ali-oss";

// lib/oss.ts 在模块加载时读取 env，必须先加载 .env 再动态 import
for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const RULE_ID = "yuanlu-speech-expiry";
const PREFIX = "yuanlu/speech/";

/** 与 ali-oss 生命周期规则结构对齐的最小类型（get 返回、put 入参共用） */
interface LifecycleRuleLike {
  id?: string;
  prefix?: string;
  status?: string;
  expiration?: { days?: number; date?: string };
  [key: string]: unknown;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const daysArg = args.find((a) => a.startsWith("--days="));
  const days = daysArg ? Number(daysArg.split("=")[1]) : NaN;
  if (!Number.isFinite(days) || days < 1) {
    console.error(
      "usage: npx tsx scripts/set-speech-lifecycle.ts --days=<N> [--apply]",
    );
    process.exit(1);
  }

  const bucket = process.env.OSS_BUCKET!;
  const { default: OSS } = await import("ali-oss");
  const client = new OSS({
    region: process.env.OSS_REGION as string,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID as string,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET as string,
    bucket,
    secure: true,
  });

  // 读取现有规则（无任何生命周期配置时 OSS 报 NoSuchLifecycle，按空处理）。
  // 运行时 get/put 均为嵌套 expiration 规范格式；@types/ali-oss 的扁平
  // LifecycleRule 声明与此不符，边界处经 unknown 对齐
  let existing: LifecycleRuleLike[] = [];
  try {
    const res = await client.getBucketLifecycle(bucket);
    existing = (res.rules ?? []) as unknown as LifecycleRuleLike[];
  } catch (e) {
    if ((e as { code?: string })?.code !== "NoSuchLifecycle") throw e;
  }

  const others = existing.filter((r) => r.id !== RULE_ID);
  const plannedRule: LifecycleRuleLike = {
    id: RULE_ID,
    prefix: PREFIX,
    status: "Enabled",
    expiration: { days },
  };

  console.log(`Bucket: ${bucket}`);
  console.log("现有规则:", JSON.stringify(existing, null, 2));
  console.log("计划规则:", JSON.stringify(plannedRule, null, 2));

  if (!apply) {
    console.log("\n[DRY-RUN] 未下发。确认无误后加 --apply 执行。");
    return;
  }

  await client.putBucketLifecycle(bucket, [
    ...others,
    plannedRule,
  ] as unknown as OSS.LifecycleRule[]);
  console.log(
    `\n[APPLY] 已下发：${PREFIX} 前缀 ${days} 天后删除（其余规则保持不变）。`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
