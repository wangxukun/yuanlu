/**
 * 修复被人为修改的 podcast.totalPlays：
 *   npx tsx scripts/fix-podcast-total-plays.ts          # 预览（dry-run）
 *   npx tsx scripts/fix-podcast-total-plays.ts --apply  # 实际写库
 *
 * 依据：incrementPlayCount 对 episode.playCount 与 podcast.totalPlays
 * 同事务 +1，剧集导入时计数为 0，故真实值 = SUM(该播客全部单集 playCount)。
 * 单集计数经分布形态核验为有机累积（长尾、与收听用户数相关），17/36
 * 播客两值严格相等佐证不变量成立；不一致的 19 个即被改过的行。
 *
 * 写库前将旧值备份到 scripts/tmp-totalplays-backup-<date>.json，
 * 可据此回滚。
 */
import * as fs from "node:fs";
import * as path from "node:path";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

import prisma from "@/lib/prisma";

const APPLY = process.argv.includes("--apply");
const backupFile = path.join(
  process.cwd(),
  "scripts",
  `tmp-totalplays-backup-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.json`,
);

async function main() {
  const rows = await prisma.$queryRaw<
    {
      podcastid: string;
      title: string;
      totalplays: number;
      sum_episode_plays: string | number;
    }[]
  >`
    SELECT p.podcastid,
           p.title,
           p."totalPlays" AS totalplays,
           COALESCE(SUM(e."playCount"), 0) AS sum_episode_plays
    FROM podcast p
    LEFT JOIN episode e ON e.podcastid = p.podcastid
    GROUP BY p.podcastid, p.title, p."totalPlays"
  `;

  const fixes = rows
    .map((r) => ({ ...r, real: Number(r.sum_episode_plays) }))
    .filter((r) => r.totalplays !== r.real);

  if (fixes.length === 0) {
    console.log("所有播客 totalPlays 均与单集之和一致，无需修复。");
    return;
  }

  console.log(
    `待修复 ${fixes.length} 行（模式：${APPLY ? "APPLY 写库" : "DRY-RUN 预览"}）\n`,
  );
  for (const f of fixes) {
    console.log(
      `${f.title} | ${f.totalplays} -> ${f.real} (${f.real - f.totalplays > 0 ? "+" : ""}${f.real - f.totalplays})`,
    );
  }

  if (!APPLY) {
    console.log("\n(dry-run 未写库；追加 --apply 执行)");
    return;
  }

  const backup = fixes.map((f) => ({
    podcastid: f.podcastid,
    title: f.title,
    oldTotalPlays: f.totalplays,
    newTotalPlays: f.real,
    fixedAt: new Date().toISOString(),
  }));
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), "utf-8");
  console.log(`\n旧值已备份: ${backupFile}`);

  await prisma.$transaction(
    fixes.map((f) =>
      prisma.podcast.update({
        where: { podcastid: f.podcastid },
        data: { totalPlays: f.real },
      }),
    ),
  );
  console.log(`已更新 ${fixes.length} 行。`);

  const remain = await prisma.$queryRaw<{ cnt: string | number }[]>`
    SELECT COUNT(*) AS cnt
    FROM (
      SELECT p.podcastid
      FROM podcast p
      LEFT JOIN episode e ON e.podcastid = p.podcastid
      GROUP BY p.podcastid, p."totalPlays"
      HAVING p."totalPlays" <> COALESCE(SUM(e."playCount"), 0)
    ) t
  `;
  console.log(`复检：仍有不一致播客 ${Number(remain[0]?.cnt)} 个（应为 0）`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
