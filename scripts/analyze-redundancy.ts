import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- 冗余数据分析开始 ---");

  // 1. 孤儿单集 (无归属播客)
  const orphanEpisodesCount = await prisma.episode.count({
    where: { podcastid: null },
  });
  console.log(
    `1. episode表中 podcastid 为空的孤儿单集数量: ${orphanEpisodesCount}`,
  );

  // 2. 无主单集 (无上传者)
  const noUploaderEpisodesCount = await prisma.episode.count({
    where: { uploaderid: null },
  });
  console.log(
    `2. episode表中 uploaderid 为空的无主单集数量: ${noUploaderEpisodesCount}`,
  );

  // 3. 业务废弃字段遗留数据 (旧版SRT字幕)
  const obsoleteSubtitlesCount = await prisma.episode.count({
    where: {
      OR: [
        { subtitleEnUrl: { not: null } },
        { subtitleZhUrl: { not: null } },
        { subtitleEnFileName: { not: null } },
        { subtitleZhFileName: { not: null } },
      ],
    },
  });
  console.log(
    `3. episode表中 仍残留旧版SRT字幕字段数据的单集数量: ${obsoleteSubtitlesCount}`,
  );

  // 4. 可空外键意外为空导致的孤儿业务记录
  const tablesWithNullableFks = [
    { name: "listening_history", fks: ["userid", "episodeid"] },
    { name: "comments", fks: ["userid", "episodeid"] },
    { name: "ratings", fks: ["userid", "episodeid"] },
    { name: "vocabulary", fks: ["userid", "episodeid"] },
    { name: "discussion_threads", fks: ["userid", "episodeid"] },
    { name: "episode_favorites", fks: ["userid", "episodeid"] },
    { name: "podcast_favorites", fks: ["userid", "podcastid"] },
    { name: "speech_recognition", fks: ["userid", "episodeid"] },
    { name: "quizzes", fks: ["episodeid"] },
    { name: "notifications", fks: ["userid"] },
    { name: "learning_paths", fks: ["userid"] },
  ];

  for (const table of tablesWithNullableFks) {
    const OR_conditions = table.fks.map((fk) => ({ [fk]: null }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const count = await (prisma as any)[table.name].count({
      where: { OR: OR_conditions },
    });
    console.log(
      `4. ${table.name} 表中由于外键(${table.fks.join(",")})为空导致的孤儿记录数量: ${count}`,
    );
  }

  console.log("--- 冗余数据分析结束 ---");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
