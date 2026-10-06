/**
 * 一次性脚本：更新剧集封面字段（coverUrl / coverFileName）
 * 输入：D:/wxkzd/AI-Podcast-Studio/播客收录控制/Espresso English/cover_update.json
 *   { "<episodeid>": { "coverUrl": "...", "coverFileName": "..." }, ... }
 * 用法：cd D:/WebstormProjects/yuanlu && npx tsx scripts/update-episode-cover.ts
 */
import * as fs from "node:fs";
import prisma from "@/lib/prisma";

const INPUT =
  "D:/wxkzd/AI-Podcast-Studio/播客收录控制/Espresso English/cover_update.json";

async function main() {
  const updates = JSON.parse(fs.readFileSync(INPUT, "utf-8")) as Record<
    string,
    { coverUrl: string; coverFileName: string }
  >;
  for (const [episodeid, up] of Object.entries(updates)) {
    const e = await prisma.episode.update({
      where: { episodeid },
      data: { coverUrl: up.coverUrl, coverFileName: up.coverFileName },
      select: { episodeid: true, title: true, coverFileName: true },
    });
    console.log(`updated ${e.episodeid} (${e.title}) -> ${e.coverFileName}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
