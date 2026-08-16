/**
 * Script to batch remove the `isExclusive` flag from the `episode` table.
 *
 * 反向操作 scripts/update-exclusive.ts：将所有剧集设为免费（isExclusive = false），
 * 用于从「内容付费墙」切换到「内容全免费 + 增值服务收费」的商业模式。
 *
 * Logic:
 * - Group episodes by podcast (retrieve all podcasts).
 * - For each podcast, count episodes with isExclusive != false, and batch update them to false.
 * - Default is DRY-RUN: only prints what would change, nothing is written.
 * - Pass `--apply` to actually write to the database.
 *
 * command:
 *   npx tsx scripts/remove-exclusive.ts          # 预览模式（只打印，不写库）
 *   npx tsx scripts/remove-exclusive.ts --apply  # 执行写库
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  if (!APPLY) {
    console.log(
      "=== 预览模式（dry-run），不会修改数据库。追加 --apply 参数执行写库 ===\n",
    );
  } else {
    console.log("=== 应用模式：将批量写入数据库 ===\n");
  }

  const podcasts = await prisma.podcast.findMany({
    select: { podcastid: true, title: true },
    orderBy: { title: "asc" },
  });
  console.log(`共找到 ${podcasts.length} 个播客。\n`);

  let totalExclusive = 0;
  let totalUpdated = 0;

  for (const podcast of podcasts) {
    // 统计该播客下仍是专享的剧集数量
    const exclusiveCount = await prisma.episode.count({
      where: {
        podcastid: podcast.podcastid,
        isExclusive: { not: false },
      },
    });

    if (exclusiveCount === 0) {
      console.log(`[${podcast.title}] 无专享剧集，跳过`);
      continue;
    }

    totalExclusive += exclusiveCount;

    if (APPLY) {
      const res = await prisma.episode.updateMany({
        where: {
          podcastid: podcast.podcastid,
          isExclusive: { not: false },
        },
        data: { isExclusive: false },
      });
      totalUpdated += res.count;
      console.log(`[${podcast.title}] 已将 ${res.count} 集设为免费`);
    } else {
      console.log(`[${podcast.title}] 将设为免费: ${exclusiveCount} 集`);
    }
  }

  console.log("\n=== 汇总 ===");
  console.log(`当前专享剧集总数: ${totalExclusive}`);
  if (APPLY) {
    console.log(`本次实际更新: ${totalUpdated} 集`);
    console.log("批量下架完成！");
  } else {
    console.log(`预览模式下将更新: ${totalExclusive} 集（未写库）`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
