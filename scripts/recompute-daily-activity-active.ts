/**
 * Script to recompute `user_daily_activity.isActive` against each user's
 * `user_profile.dailyStudyGoalMins`.
 *
 * 背景：历史上 isActive 的达标线是硬编码的 300 秒（5 分钟），与用户设置的
 * "每日学习时长目标"无关，导致学习 14 分钟（目标 15 分钟）也能维持连胜。
 * 现打卡判定已改为与目标强绑定（见 core/stats/stats.service.ts），
 * 本脚本用于把存量数据按当前目标重算。
 *
 * 注意：目标值没有历史版本，重算一律使用用户"当前"的目标。
 * 如果只想修正最近几天的数据（避免用今天的目标改写太久远的历史），
 * 传 --from=YYYY-MM-DD 只处理该日期之后的记录。
 *
 * Usage:
 *   npx tsx scripts/recompute-daily-activity-active.ts [--from=YYYY-MM-DD] [--apply]
 *
 * 默认 dry-run（只统计不写入），确认无误后加 --apply 执行。
 */

import { PrismaClient } from "@prisma/client";
import { DEFAULT_DAILY_GOAL_MINS } from "../core/stats/stats.service";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const fromArg = args.find((a) => a.startsWith("--from="));

  let fromDate: Date | null = null;
  if (fromArg) {
    const raw = fromArg.split("=")[1];
    fromDate = new Date(`${raw}T00:00:00Z`);
    if (isNaN(fromDate.getTime())) {
      throw new Error(`Invalid --from date: ${raw}`);
    }
  }

  // 双引号保留 Prisma 驼峰列名（PG 会把未加引号的标识符折叠为小写）
  const threshold = `GREATEST(COALESCE(
      (SELECT p."dailyStudyGoalMins" FROM user_profile p WHERE p.userid = a.userid),
      ${DEFAULT_DAILY_GOAL_MINS}
    ), 1) * 60`;
  const scope = fromDate
    ? `WHERE a.date >= '${fromDate.toISOString().slice(0, 10)}'::date`
    : "";

  const rows = (await prisma.$queryRawUnsafe(`
    SELECT
      COUNT(*) FILTER (WHERE a."isActive" AND a."listeningSeconds" < ${threshold}) AS deactivate,
      COUNT(*) FILTER (WHERE NOT a."isActive" AND a."listeningSeconds" >= ${threshold}) AS activate
    FROM user_daily_activity a
    ${scope}
  `)) as Array<{ deactivate: bigint | null; activate: bigint | null }>;

  const wouldDeactivate = Number(rows[0]?.deactivate ?? 0);
  const wouldActivate = Number(rows[0]?.activate ?? 0);
  const scopeLabel = fromDate
    ? `date >= ${fromDate.toISOString().slice(0, 10)}`
    : "全部历史记录";

  console.log(`[Recompute isActive] 范围：${scopeLabel}`);
  console.log(`  将被取消打卡（点亮 → 熄灭）：${wouldDeactivate} 条`);
  console.log(`  将被补上打卡（熄灭 → 点亮）：${wouldActivate} 条`);

  if (!apply) {
    console.log("dry-run 模式，未写入任何数据。确认无误后追加 --apply 执行。");
    return;
  }

  const result = await prisma.$executeRawUnsafe(`
    UPDATE user_daily_activity a
    SET "isActive" = (a."listeningSeconds" >= ${threshold})
    ${scope}
  `);

  console.log(`已重算 ${result} 条记录的 isActive。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
