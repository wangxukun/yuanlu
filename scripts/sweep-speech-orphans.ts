/**
 * 清扫 yuanlu/speech/ 前缀下失去 DB 引用的"孤儿"对象：
 *   npx tsx scripts/sweep-speech-orphans.ts --days=30          # dry-run：只统计与列举
 *   npx tsx scripts/sweep-speech-orphans.ts --days=30 --apply  # 实际删除
 *
 * 背景：Bucket 生命周期规则是属主账号才能配置的管理接口（应用 AK/SK 只有
 * 对象级权限，getBucketLifecycle 报 AccessDenied "does not belong to you"，
 * 见 scripts/set-speech-lifecycle.ts）。若不在控制台配置生命周期，删除侧分工：
 * - 每日 cron（lib/cleanupCron.ts → core/speech/speech-cleanup.service.ts）：
 *   有 DB 引用且超期的文件，先删对象再置空引用；
 * - 本脚本：无任何 DB 引用的孤儿（历史剧集删除残留、上传后落库失败的残留、
 *   presign 直传未落库等），仅删 lastModified 超过 --days 天的，防止误删
 *   刚上传尚未落库的新文件。建议每月手动跑一次。
 */
import * as fs from "node:fs";

// lib/oss.ts / lib/prisma 在模块加载时读取 env，必须先加载 .env 再动态 import
for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

interface ListedObject {
  name: string;
  size: number;
  lastModified?: string;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const daysArg = args.find((a) => a.startsWith("--days="));
  const days = daysArg ? Number(daysArg.split("=")[1]) : NaN;
  if (!Number.isFinite(days) || days < 1) {
    console.error(
      "usage: npx tsx scripts/sweep-speech-orphans.ts --days=<N> [--apply]",
    );
    process.exit(1);
  }
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const bucket = process.env.OSS_BUCKET!;

  // 1. 收集 DB 中全部仍被引用的对象 key
  const prismaMod = await import("@/lib/prisma");
  const rows = await prismaMod.default.speech_recognition.findMany({
    where: {
      OR: [{ userAudioUrl: { not: null } }, { detailUrl: { not: null } }],
    },
    select: { userAudioUrl: true, detailUrl: true },
  });
  const { extractOssKey, deleteObject } = await import("@/lib/oss");
  const referenced = new Set<string>();
  for (const row of rows) {
    for (const url of [row.userAudioUrl, row.detailUrl]) {
      const key = url ? extractOssKey(url) : null;
      if (key) referenced.add(key);
    }
  }

  // 2. 分页列举 yuanlu/speech/ 前缀全部对象
  const { default: OSS } = await import("ali-oss");
  const client = new OSS({
    region: process.env.OSS_REGION as string,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID as string,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET as string,
    bucket,
    secure: true,
  });

  const candidates: ListedObject[] = [];
  let total = 0;
  let referencedCount = 0;
  let marker: string | undefined;
  for (;;) {
    const res = (await client.list(
      {
        prefix: "yuanlu/speech/",
        "max-keys": 1000,
        ...(marker ? { marker } : {}),
      },
      {},
    )) as {
      objects?: ListedObject[];
      isTruncated?: boolean;
      nextMarker?: string;
    };
    const objects = res.objects ?? [];
    total += objects.length;
    for (const obj of objects) {
      if (referenced.has(obj.name)) {
        referencedCount += 1;
        continue;
      }
      const modified = obj.lastModified
        ? new Date(obj.lastModified).getTime()
        : 0;
      if (modified && modified < cutoff) candidates.push(obj);
    }
    if (!res.isTruncated || !res.nextMarker) break;
    marker = res.nextMarker;
  }

  const orphanBytes = candidates.reduce((acc, o) => acc + (o.size || 0), 0);
  console.log(`Bucket: ${bucket}`);
  console.log(
    `yuanlu/speech/ 共 ${total} 个对象：${referencedCount} 个仍被 DB 引用（由每日 cron 按保留期清理），` +
      `${candidates.length} 个孤儿超过 ${days} 天（${
        apply ? "执行删除" : "待删除"
      }，共 ${(orphanBytes / 1024 / 1024).toFixed(1)} MB）`,
  );
  for (const o of candidates.slice(0, 20)) {
    console.log(
      `  - ${o.name} (${(o.size / 1024).toFixed(0)} KB, ${o.lastModified})`,
    );
  }
  if (candidates.length > 20)
    console.log(`  ... 其余 ${candidates.length - 20} 个省略`);

  if (!apply) {
    console.log("\n[DRY-RUN] 未删除。确认无误后加 --apply 执行。");
    return;
  }

  let deleted = 0;
  let failed = 0;
  for (const o of candidates) {
    // deleteObject 内部吞错并返回 undefined，据此计数失败对象
    const res = await deleteObject(o.name);
    if (res) deleted += 1;
    else failed += 1;
  }
  console.log(
    `\n[APPLY] 删除完成：${deleted} 个，失败 ${failed} 个（失败对象下次运行时重试）。`,
  );

  await prismaMod.default.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
