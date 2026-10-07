/**
 * 跟读录音 OSS 对账清理（手动版，首次上线/存量清理用）：
 *   npx tsx scripts/cleanup-speech-oss.ts --days=180          # dry-run 对账，只统计
 *   npx tsx scripts/cleanup-speech-oss.ts --days=180 --apply  # 实际删除并置空 DB 引用
 *
 * 与 lib/cleanupCron.ts 的每日 3:30 定时任务调用同一 core 服务
 * （core/speech/speech-cleanup.service.ts）。days 应与 cron 保留期一致
 * （默认 90 = OSS 生命周期 91 天 - 1，引用先于对象删除被置空）。
 */
import * as fs from "node:fs";

// lib/oss.ts 在模块加载时读取 env，必须先加载 .env 再动态 import
for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const daysArg = args.find((a) => a.startsWith("--days="));
  const days = daysArg ? Number(daysArg.split("=")[1]) : NaN;
  if (!Number.isFinite(days) || days <= 0) {
    console.error(
      "usage: npx tsx scripts/cleanup-speech-oss.ts --days=<N> [--apply]",
    );
    process.exit(1);
  }

  const { cleanupExpiredSpeechMedia } = await import(
    "@/core/speech/speech-cleanup.service"
  );
  const result = await cleanupExpiredSpeechMedia(days, { dryRun: !apply });

  console.log(
    apply
      ? `[APPLY] 清理完成：扫描 ${result.scannedRows} 行，删除对象 ${result.objectsDeleted} 个（失败 ${result.objectsFailed}），置空引用 ${result.rowsCleared} 行`
      : `[DRY-RUN] 对账完成：${days} 天前仍带录音/明细引用的行共 ${result.scannedRows} 行（加 --apply 执行删除）`,
  );
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
