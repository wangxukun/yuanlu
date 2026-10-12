/**
 * 播放计数一致性只读校验（修正版，无 join 扇出）：
 *   npx tsx scripts/verify-play-counts.ts
 *
 * 不变量：incrementPlayCount 同事务对 episode.playCount 与 podcast.totalPlays
 * 各 +1，且剧集导入时 playCount 默认 0 → totalPlays 应恒等于
 * SUM(该播客全部单集 playCount)。列出不一致者即为被改过的行。
 */
import * as fs from "node:fs";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

import prisma from "@/lib/prisma";

async function main() {
  const rows = await prisma.$queryRaw<
    {
      podcastid: string;
      title: string;
      totalplays: number;
      sum_episode_plays: string | number;
      ep_count: string | number;
      unpub_with_plays: string | number;
    }[]
  >`
    SELECT p.podcastid,
           p.title,
           p."totalPlays" AS totalplays,
           COALESCE(s.sum_plays, 0) AS sum_episode_plays,
           COALESCE(s.ep_count, 0) AS ep_count,
           COALESCE(s.unpub_with_plays, 0) AS unpub_with_plays
    FROM podcast p
    LEFT JOIN LATERAL (
      SELECT SUM(e."playCount") AS sum_plays,
             COUNT(*) AS ep_count,
             COUNT(*) FILTER (WHERE e.status <> 'published' AND e."playCount" > 0) AS unpub_with_plays
      FROM episode e
      WHERE e.podcastid = p.podcastid
    ) s ON true
    ORDER BY p."totalPlays" DESC
  `;

  let matched = 0;
  const out: string[] = [];
  for (const r of rows) {
    const sum = Number(r.sum_episode_plays);
    if (r.totalplays === sum) {
      matched++;
      continue;
    }
    const diff = r.totalplays - sum;
    out.push(
      `${r.podcastid} | ${r.title} | totalPlays=${r.totalplays} | 真实SUM=${sum} | 差${diff > 0 ? "+" : ""}${diff} | 集数=${Number(r.ep_count)} | 有播放的下架集=${Number(r.unpub_with_plays)}`,
    );
  }

  console.log(
    `播客 ${rows.length} 个：一致 ${matched}，不一致 ${out.length}\n`,
  );
  console.log(out.join("\n"));

  const orphan = await prisma.$queryRaw<
    { cnt: string | number; plays: string | number }[]
  >`
    SELECT COUNT(*) AS cnt, COALESCE(SUM("playCount"), 0) AS plays
    FROM episode WHERE podcastid IS NULL AND "playCount" > 0
  `;
  console.log(
    `\n无所属播客但有播放的剧集: ${Number(orphan[0]?.cnt)} 集，合计 ${Number(orphan[0]?.plays)} 次（不计入任何播客）`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
