/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
/**
 * 修复 user_daily_activity 表中因时区问题导致的日期偏差
 *
 * 问题: startOfDay(new Date()) 在 UTC+8 环境下产生的日期被 PostgreSQL @db.Date 截断后
 *       会比实际中国日期早一天 (CST 7月27日 -> 存储为 7月26日)
 *
 * 修复策略: 将 createAt (Timestamptz, 始终正确) 转换为 CST 日期，
 *          若与存储的 date 不一致则修正
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function migrate() {
  console.log("=== 开始修复 user_daily_activity 日期偏差 ===\n");

  const allRecords = await prisma.user_daily_activity.findMany({
    orderBy: { date: "asc" },
    select: {
      id: true,
      userid: true,
      date: true,
      createAt: true,
      listeningSeconds: true,
      wordsLearned: true,
      isActive: true,
    },
  });

  console.log(`总记录数: ${allRecords.length}`);

  // 计算每条记录的正确日期
  const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000;
  let fixedCount = 0;
  let mergedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const record of allRecords) {
    // 根据 createAt 计算正确的中国日期
    const createCST = new Date(record.createAt.getTime() + CHINA_OFFSET_MS);
    const correctDate = new Date(
      Date.UTC(
        createCST.getUTCFullYear(),
        createCST.getUTCMonth(),
        createCST.getUTCDate(),
      ),
    );

    const storedDateStr = record.date.toISOString().split("T")[0];
    const correctDateStr = correctDate.toISOString().split("T")[0];

    // 已经正确的跳过
    if (storedDateStr === correctDateStr) {
      skippedCount++;
      continue;
    }

    try {
      // 检查正确日期是否已有该用户的记录
      const existing = await prisma.user_daily_activity.findUnique({
        where: {
          userid_date: {
            userid: record.userid,
            date: correctDate,
          },
        },
      });

      if (existing) {
        // 合并: 累加秒数到已有记录，删除错误记录
        await prisma.user_daily_activity.update({
          where: { id: existing.id },
          data: {
            listeningSeconds: {
              increment: record.listeningSeconds,
            },
            wordsLearned: {
              increment: record.wordsLearned,
            },
            isActive: existing.isActive || record.isActive,
          },
        });
        await prisma.user_daily_activity.delete({
          where: { id: record.id },
        });
        mergedCount++;
        console.log(
          `  MERGE ${record.id}: ${storedDateStr} -> ${correctDateStr} (+${record.listeningSeconds}s)`,
        );
      } else {
        // 直接修正日期
        await prisma.user_daily_activity.update({
          where: { id: record.id },
          data: { date: correctDate },
        });
        fixedCount++;
      }
    } catch (e) {
      errorCount++;
      console.error(`  ERROR ${record.id}: ${e.message}`);
    }
  }

  console.log(`\n=== 修复完成 ===`);
  console.log(`  已修正: ${fixedCount}`);
  console.log(`  已合并: ${mergedCount}`);
  console.log(`  无需修改: ${skippedCount}`);
  console.log(`  错误: ${errorCount}`);
  console.log(`  总计: ${allRecords.length}`);
}

migrate()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    process.exit(0);
  });
