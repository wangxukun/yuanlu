/**
 * 单集 playCount 分布形态分析（只读）：
 *   npx tsx scripts/analyze-play-distribution.ts
 * 判断单集计数是自然长尾（多数 0/低值、少数高值、与收听用户数相关）
 * 还是批量造数（全集均匀抬升、与听众数无关）。
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
  const pods = await prisma.$queryRaw<
    { podcastid: string; title: string; totalplays: number }[]
  >`
    SELECT podcastid, title, "totalPlays" AS totalplays
    FROM podcast ORDER BY "totalPlays" DESC
  `;

  for (const p of pods.slice(0, 14)) {
    const eps = await prisma.$queryRaw<
      {
        title: string;
        playcount: number;
        listeners: string | number;
        published: Date;
      }[]
    >`
      SELECT e.title,
             e."playCount" AS playcount,
             COUNT(lh.historyid) AS listeners,
             e."publishAt" AS published
      FROM episode e
      LEFT JOIN listening_history lh ON lh.episodeid = e.episodeid
      WHERE e.podcastid = ${p.podcastid}
      GROUP BY e.episodeid, e.title, e."playCount", e."publishAt"
      ORDER BY e."playCount" DESC
    `;
    const plays = eps.map((e) => e.playcount);
    const zeros = plays.filter((v) => v === 0).length;
    const top = plays[0] ?? 0;
    const sum = plays.reduce((a, b) => a + b, 0);
    const withListeners = eps.filter((e) => Number(e.listeners) > 0).length;
    const top5 = eps
      .slice(0, 5)
      .map((e) => `${e.playcount}(${Number(e.listeners)}人)`)
      .join(" ");
    const mid = eps.slice(Math.max(0, eps.length - 6), eps.length - 1);
    const tail = mid.map((e) => `${e.playcount}`).join(",");
    console.log(
      `${p.title} | totalPlays=${p.totalplays} | eps=${eps.length} | sum=${sum} | zeros=${zeros} | top=${top} | top5=${top5} | 尾部样例=${tail} | 有听众行集数=${withListeners}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
