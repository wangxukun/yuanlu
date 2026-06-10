/**
 * Script to batch update the `isExclusive` field for the `episode` table.
 *
 * Logic:
 * - Group episodes by podcast (retrieve all podcasts).
 * - For each podcast, sort all associated episodes by `publishAt` ascending (earliest to latest).
 * - Update the earliest 5 episodes to non-exclusive (`isExclusive = false`).
 * - Update all remaining episodes to exclusive (`isExclusive = true`).
 *
 * command: npx tsx scripts/update-exclusive.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("开始按播客分类批量更新 episode 的 isExclusive 状态...");

  // 1. 获取所有 podcast
  const podcasts = await prisma.podcast.findMany({
    select: { podcastid: true, title: true },
  });

  console.log(`共找到 ${podcasts.length} 个播客。`);

  for (const podcast of podcasts) {
    console.log(`正在处理播客: ${podcast.title} (${podcast.podcastid})...`);

    // 2. 查询该播客下所有的 episode，按 publishAt 升序（由早到晚）排序
    const episodes = await prisma.episode.findMany({
      where: { podcastid: podcast.podcastid },
      orderBy: { publishAt: "asc" },
      select: { episodeid: true, publishAt: true, title: true },
    });

    console.log(`  该播客共有 ${episodes.length} 集剧集。`);

    if (episodes.length === 0) {
      continue;
    }

    // 最早发布的 5 集
    const earliestEpisodes = episodes.slice(0, 5);
    const earliestIds = earliestEpisodes.map((e) => e.episodeid);

    // 剩余的剧集
    const remainingEpisodes = episodes.slice(5);
    const remainingIds = remainingEpisodes.map((e) => e.episodeid);

    // 3. 执行更新
    if (earliestIds.length > 0) {
      const resFalse = await prisma.episode.updateMany({
        where: { episodeid: { in: earliestIds } },
        data: { isExclusive: false },
      });
      console.log(
        `  已将最早的 ${resFalse.count} 集设置为非专属 (isExclusive: false)`,
      );
    }

    if (remainingIds.length > 0) {
      const resTrue = await prisma.episode.updateMany({
        where: { episodeid: { in: remainingIds } },
        data: { isExclusive: true },
      });
      console.log(
        `  已将剩余的 ${resTrue.count} 集设置为专属 (isExclusive: true)`,
      );
    }
  }

  console.log("批量更新完成！");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
