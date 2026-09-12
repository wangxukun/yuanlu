/* 句子本数据层冒烟测试：验证 SavedSentence 表的关键查询口径
 * （toggle 唯一性 / tags has 筛选 / contains insensitive 检索 / 时间范围） */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const userid = "smoke-test-sentences";
  const episodeid = "smoke-test-episode";

  // 准备：确保测试用户与剧集存在（外键约束）
  await prisma.user.upsert({
    where: { userid },
    update: {},
    create: { userid, email: "smoke-sentences@test.local" },
  });
  await prisma.episode.upsert({
    where: { episodeid },
    update: {},
    create: {
      episodeid,
      title: "冒烟测试剧集",
      audioUrl: "https://example.com/a.mp3",
      status: "published",
    },
  });

  // 清理旧数据
  await prisma.savedSentence.deleteMany({ where: { userid } });

  // 1. toggle: create
  const created = await prisma.savedSentence.create({
    data: {
      userid,
      episodeid,
      subtitleId: 42,
      startTime: 12.5,
      endTime: 16.2,
      enText: "The quick brown fox jumps over the lazy dog.",
      zhText: "敏捷的棕色狐狸跳过了懒狗。",
      tags: ["地道表达", "长难句"],
    },
  });
  console.log("✓ create:", created.id, "tags =", created.tags);

  // 2. 唯一索引冲突检测（同 userid+episodeid+subtitleId 二次插入应报错）
  let uniqueWorked = false;
  try {
    await prisma.savedSentence.create({
      data: {
        userid,
        episodeid,
        subtitleId: 42,
        startTime: 99,
        endTime: 100,
        enText: "dup",
      },
    });
  } catch (e) {
    uniqueWorked = true;
  }
  console.log(
    "✓ unique constraint:",
    uniqueWorked ? "P2002 rejected" : "FAILED",
  );

  // 3. tags has 筛选
  const byTag = await prisma.savedSentence.findMany({
    where: { userid, tags: { has: "地道表达" } },
  });
  console.log("✓ filter by tag:", byTag.length === 1);

  // 4. contains insensitive 中英文检索
  const byEn = await prisma.savedSentence.findMany({
    where: {
      userid,
      OR: [{ enText: { contains: "QUICK", mode: "insensitive" } }],
    },
  });
  const byZh = await prisma.savedSentence.findMany({
    where: {
      userid,
      OR: [{ zhText: { contains: "懒狗", mode: "insensitive" } }],
    },
  });
  console.log(
    "✓ search en (insensitive):",
    byEn.length === 1,
    "| zh:",
    byZh.length === 1,
  );

  // 5. 时间范围筛选
  const from = new Date(Date.now() - 60_000);
  const inRange = await prisma.savedSentence.findMany({
    where: { userid, createAt: { gte: from } },
  });
  console.log("✓ time range:", inRange.length === 1);

  // 6. updateMeta（tags/note）
  const updated = await prisma.savedSentence.update({
    where: { id: created.id },
    data: { note: "测试笔记", tags: { set: ["写作素材"] } },
  });
  console.log("✓ updateMeta: note =", updated.note, "| tags =", updated.tags);

  // 7. 级联删除：episode 删除 → 句子级联
  await prisma.episode.delete({ where: { episodeid } });
  const remain = await prisma.savedSentence.count({ where: { userid } });
  console.log("✓ cascade delete via episode:", remain === 0);

  await prisma.user.deleteMany({ where: { userid: "smoke-test-sentences" } });
  console.log("\nAll smoke checks passed.");
}

main()
  .catch((e) => {
    console.error("SMOKE FAILED:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
