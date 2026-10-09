/**
 * 频道品牌横幅入库：npx tsx scripts/seed-channel-covers.ts
 * 将 11 个频道的 OSS key 与展示顺序 upsert 到 channel 表（幂等，可重复执行）。
 * sortOrder 与既有展示顺序（totalPlays 降序）一致，保证迁移后页面顺序不变。
 * 注意：lib/prisma 经 @prisma/client 读取 env，必须先加载 .env 再动态 import（同 upload-file.ts）。
 */
import * as fs from "node:fs";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const SEED: Array<{ name: string; coverFileName: string; sortOrder: number }> =
  [
    {
      name: "BBC Learning English",
      coverFileName: "channel-covers/bbc-learning-english.png",
      sortOrder: 1,
    },
    {
      name: "VOA Learning English",
      coverFileName: "channel-covers/voa-learning-english.png",
      sortOrder: 2,
    },
    { name: "ELLLO", coverFileName: "channel-covers/elllo.jpg", sortOrder: 3 },
    {
      name: "English Like A Native",
      coverFileName: "channel-covers/english-like-a-native.jpg",
      sortOrder: 4,
    },
    {
      name: "BBC World Service",
      coverFileName: "channel-covers/bbc-world-service.png",
      sortOrder: 5,
    },
    {
      name: "The New York Times",
      coverFileName: "channel-covers/the-new-york-times.png",
      sortOrder: 6,
    },
    { name: "CNN", coverFileName: "channel-covers/cnn.png", sortOrder: 7 },
    { name: "NPR", coverFileName: "channel-covers/npr.png", sortOrder: 8 },
    {
      name: "Espresso English",
      coverFileName: "channel-covers/espresso-english.jpg",
      sortOrder: 9,
    },
    {
      name: "Luke's ENGLISH Podcast",
      coverFileName: "channel-covers/lukes-english-podcast.jpg",
      sortOrder: 10,
    },
    { name: "SEND7", coverFileName: "channel-covers/send7.jpg", sortOrder: 11 },
  ];

async function main() {
  const prisma = (await import("@/lib/prisma")).default;
  for (const row of SEED) {
    const saved = await prisma.channel.upsert({
      where: { name: row.name },
      update: { coverFileName: row.coverFileName, sortOrder: row.sortOrder },
      create: row,
    });
    console.log(
      `${saved.name} -> ${saved.coverFileName} (order ${saved.sortOrder})`,
    );
  }
  const total = await prisma.channel.count();
  console.log(`channel rows: ${total}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
