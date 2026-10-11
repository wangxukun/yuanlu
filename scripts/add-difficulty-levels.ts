/**
 * 一次性脚本：按评估结果更新已发布频道的难度体系（2026-10-11 审核通过清单）
 *   1. 剧集 difficulty 字段：36 档全量 updateMany 为目标值（范围难度取上限，顺带归一 General 杂值）
 *   2. 播客标签组：追加难度标签；满 5 的 8 档按清单替换一个冗余标签
 *   3. 剧集标签组：全部已发布剧集追加难度标签（允许第 6 个）
 * 安全：默认干跑——逐档断言 频道存在 + 现有标签与快照一致 + 剧集难度分布与 2026-10-11
 *   调研一致，任一不符整体中止；--apply 才写入，写后回读断言。幂等可重跑。
 * 用法：cd D:/WebstormProjects/yuanlu
 *   npx tsx scripts/add-difficulty-levels.ts          # 干跑校验
 *   npx tsx scripts/add-difficulty-levels.ts --apply  # 实际写入
 */
import prisma from "@/lib/prisma";

type Row = {
  id: string;
  title: string;
  oldDiff: string; // 写入前剧集 difficulty 应一致为该值（允许残留 General）
  target: string; // 目标难度（= 追加的难度标签名）
  remove?: string; // 满 5 标签需腾位替换的冗余标签
  expectTags: string[]; // 写入前频道标签应恰好为该集合（2026-10-11 美音/英音工作后快照）
};

const ROWS: Row[] = [
  // ── BBC Learning English ──
  {
    id: "cmivwgyal0002dy4ox06ri749",
    title: "Learning Easy English",
    oldDiff: "A2",
    target: "A2",
    expectTags: ["日常生活", "英音"],
  },
  {
    id: "cmhxl95jl000mdyv8symgylk6",
    title: "6 Minute English",
    oldDiff: "B1",
    target: "B1",
    expectTags: ["日常生活", "六分钟英语", "英音"],
  },
  {
    id: "cmiuk5l990000dykoguncqfyb",
    title: "Learning English For Work",
    oldDiff: "B2",
    target: "B2",
    expectTags: ["商务英语", "英音"],
  },
  {
    id: "cmm7me07d0a0rgxn80ssm3baw",
    title: "Learning English Conversations",
    oldDiff: "B1",
    target: "B1",
    expectTags: ["日常生活", "英语会话", "地道英语", "英音"],
  },
  {
    id: "cmj8c1sjb0000dytw9xy7un8y",
    title: "Learning English Stories",
    oldDiff: "B1",
    target: "B1",
    expectTags: ["故事", "英音"],
  },
  {
    id: "cmj2yukho0000dy5siiyxvi3x",
    title: "Learning English Grammar",
    oldDiff: "B1",
    target: "B1",
    expectTags: ["英语语法", "英音"],
  },
  {
    id: "cmmfvgk8p0xqggxn8sjbyqovf",
    title: "Learning English from the News",
    oldDiff: "B2",
    target: "B2",
    expectTags: ["新闻", "英音"],
  },
  {
    id: "cmmna1i1h04rzgxsfod37cd68",
    title: "Beating Speaking Anxiety",
    oldDiff: "B1",
    target: "B1",
    expectTags: ["战胜说话焦虑", "英音"],
  },
  {
    id: "cmuwhq1ym01kagxuu4shspun4",
    title: "Learning English Vocabulary",
    oldDiff: "B1",
    target: "B1",
    expectTags: ["词汇扩展", "日常英语", "英音"],
  }, // 英语学习已被后台移除
  // ── 其他英语学习 ──
  {
    id: "cmat8yz6u000eqassb968qt07",
    title: "English Like A Native",
    oldDiff: "B2",
    target: "B2",
    expectTags: ["英语词汇", "英音"],
  },
  {
    id: "cmuw77ajd00vtgxuuvvqpwmkq",
    title: "Espresso English Podcast",
    oldDiff: "B1",
    target: "B1",
    expectTags: ["语法", "词汇", "两分钟英语", "美音"],
  }, // 已不满5，无需替换
  {
    id: "cmv0ri68g01mygxukzd3yk3qd",
    title: "Simple English News Daily",
    oldDiff: "B1",
    target: "B1",
    expectTags: ["每日新闻", "国际时事"],
  },
  {
    id: "cmuyapoc500j4gxuxz5cio2kz",
    title: "Luke's ENGLISH Podcast - Learn British English with Luke Thompson",
    oldDiff: "B1",
    target: "B2",
    expectTags: ["语言学习", "英音"],
  },
  // ── ELLLO ──
  {
    id: "cmk5iw40h01a2gxkaet6p63w2",
    title: "Learn Grammar for CEFR A1",
    oldDiff: "A1",
    target: "A1",
    expectTags: ["英语语法"],
  },
  {
    id: "cmkmq101p023ogxmkdvebja0u",
    title: "Learn Grammar for CEFR A2",
    oldDiff: "A2",
    target: "A2",
    expectTags: ["英语语法"],
  },
  {
    id: "cmv2i3ck704b5gxbqid78mvai",
    title: "ELLLO Podcast",
    oldDiff: "B1",
    target: "B2",
    expectTags: ["词汇扩展"],
  },
  // ── VOA Learning English ──
  {
    id: "cmo1mbn2c0fevgxp8o6namchh",
    title: "Words & Their Stories",
    oldDiff: "B2",
    target: "B2",
    expectTags: ["词汇故事", "美音"],
  },
  {
    id: "cmo3w2ju502i6gxgw82umie11",
    title: "Everyday Grammar",
    oldDiff: "B2",
    target: "B2",
    expectTags: ["英语语法", "美音"],
  },
  {
    id: "cmo06w4hr0agvgxp8s633o6ej",
    title: "Science & Technology",
    oldDiff: "B1",
    target: "B1",
    expectTags: ["科学与技术", "美音"],
  },
  {
    id: "cmo8gsxt807digxqz5u5lfk4w",
    title: "Arts & Culture",
    oldDiff: "B2",
    target: "B1",
    expectTags: ["艺术与文化", "美音"],
  },
  {
    id: "cmo4j329h05c0gxgw1uuqmnv8",
    title: "Health & Lifestyle",
    oldDiff: "B2",
    target: "B1",
    expectTags: ["健康与生活", "美音"],
  },
  {
    id: "cmpo4vmba0cllgx3fo0vymjsf",
    title: "Ask a Teacher",
    oldDiff: "B1",
    target: "B1",
    expectTags: ["名师答疑", "美音"],
  },
  {
    id: "cmuxqf7vm00dmgx4dyb92u0ue",
    title: "As It Is - VOA Learning English",
    oldDiff: "B1",
    target: "B1",
    expectTags: ["文化探索", "新闻听力", "VOA Learning English", "美音"],
  }, // 已不满5，无需替换
  {
    id: "cmv3di3uo06yxgxbqwc3z4k9n",
    title: "U.S. History - VOA Learning English",
    oldDiff: "B1",
    target: "B1",
    expectTags: ["美国历史", "历史文化", "VOA Learning English", "美音"],
  }, // 已不满5，无需替换
  // ── BBC World Service ──
  {
    id: "cmjzubjnv046ggxloqlm8fgq8",
    title: "The Global Story",
    oldDiff: "C2",
    target: "C1",
    remove: "每日新闻",
    expectTags: ["新闻", "新闻与政治", "每日新闻", "国际时事", "英音"],
  },
  {
    id: "cmr0by5ct0jfzgxu04jxag9t4",
    title: "Global News Podcast",
    oldDiff: "C2",
    target: "C1",
    expectTags: ["新闻与政治", "每日新闻", "国际时事", "英音"],
  },
  {
    id: "cmqxc54j90czvgxu0xt24kd9z",
    title: "Death in Ice Valley",
    oldDiff: "C1",
    target: "C1",
    remove: "深度调查",
    expectTags: ["犯罪纪实", "历史悬案", "深度调查", "冷战间谍", "英音"],
  },
  {
    id: "cmqyzjp9i0gkmgxu027nokvq9",
    title: "Dramas",
    oldDiff: "C2",
    target: "C2",
    expectTags: ["小说", "戏剧", "历史与叙事", "英音"],
  },
  {
    id: "cmr0mvpz60koigxu0kb8bhvik",
    title: "The Food Chain",
    oldDiff: "C1",
    target: "C1",
    expectTags: ["饮食文化", "社会与文化", "商业与经济", "英音"],
  },
  {
    id: "cmqx7f1sn0c62gxu0zzc29pzp",
    title: "The Dark Is Rising",
    oldDiff: "C1",
    target: "C2",
    expectTags: ["故事", "小说", "英音"],
  },
  {
    id: "cmqwfi6c80bb6gxu0mo4q0ech",
    title: "What in the World",
    oldDiff: "C1",
    target: "C1",
    expectTags: ["新闻", "英音"],
  },
  // ── NYT / CNN / NPR ──
  {
    id: "cmk2m21dc016cgxb1sjshx7q1",
    title: "The Daily",
    oldDiff: "C1",
    target: "C1",
    expectTags: ["新闻", "美音"],
  },
  {
    id: "cmrm8qg1o1483gxu0g1qc327c",
    title: "CNN 5 Good Things",
    oldDiff: "C1",
    target: "C1",
    remove: "治愈温暖",
    expectTags: ["人文纪实", "暖心故事", "治愈温暖", "周末精选", "美音"],
  },
  {
    id: "cmrm57gfs13r6gxu0q4a1h3v2",
    title: "CNN 5 Things",
    oldDiff: "C1",
    target: "C1",
    remove: "高效通勤",
    expectTags: ["每日新闻", "时事速递", "全球头条", "高效通勤", "美音"],
  },
  {
    id: "cmr5sfigq0pvqgxu07qj67m6u",
    title: "Up First",
    oldDiff: "C1",
    target: "C1",
    remove: "晨间简报",
    expectTags: ["新闻与政治", "每日新闻", "时事速递", "晨间简报", "美音"],
  },
  {
    id: "cmr4yq2ow0oexgxu024976rec",
    title: "StoryCorps",
    oldDiff: "C1",
    target: "C1",
    expectTags: ["社会与文化", "人类情感", "个人故事", "美音"],
  },
];

const apply = process.argv.includes("--apply");
const sameSet = (a: string[], b: string[]) =>
  a.length === b.length &&
  [...a].sort().join("\n") === [...b].sort().join("\n");

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL 未加载");

  // ── 第一步：干跑核对 ──
  const checked: Row[] = [];
  let failed = 0,
    episodeTotal = 0;
  for (const row of ROWS) {
    const p = await prisma.podcast.findUnique({
      where: { podcastid: row.id },
      select: {
        title: true,
        tags: { select: { name: true } },
        episode: { select: { difficulty: true } },
      },
    });
    const tagNames = p ? p.tags.map((t) => t.name) : [];
    const diffs = new Set(
      p ? p.episode.map((e) => e.difficulty ?? "null") : [],
    );
    const diffOk =
      p && [...diffs].every((d) => d === row.oldDiff || d === "General");
    const tagOk = p && sameSet(tagNames, row.expectTags);
    const removeOk = !row.remove || tagNames.includes(row.remove);
    if (!p || !diffOk || !tagOk || !removeOk) {
      failed++;
      console.log(
        `✗ ${row.title} (${row.id})\n` +
          `    DB 标题: ${p?.title ?? "<不存在>"}\n` +
          `    DB 标签: [${tagNames.join("、")}]（期望 [${row.expectTags.join("、")}]）\n` +
          `    DB 剧集难度: {${[...diffs].join(",")}}（期望除 General 外全为 ${row.oldDiff}）`,
      );
    } else {
      checked.push(row);
      episodeTotal += p.episode.length;
      console.log(
        `✓ ${p.title} | ${row.oldDiff}→${row.target}${row.remove ? `（标签 −${row.remove} +${row.target}）` : `（标签 +${row.target}）`} | 剧集 ${p.episode.length} 集`,
      );
    }
  }
  if (failed) throw new Error(`${failed} 档核对失败，已整体中止（未写库）`);
  console.log(
    `\n核对通过 ${checked.length}/36 档，涉及剧集 ${episodeTotal} 集。${apply ? "开始写入…" : "（干跑，未写库；加 --apply 执行）"}`,
  );

  if (!apply) return;

  // ── 第二步：写入 ──
  for (const row of checked) {
    // 1) 剧集难度（updateMany 幂等，顺带归一 General）
    const r = await prisma.episode.updateMany({
      where: { podcastid: row.id },
      data: { difficulty: row.target },
    });
    // 2) 播客标签
    await prisma.podcast.update({
      where: { podcastid: row.id },
      data: {
        tags: {
          connectOrCreate: [
            { where: { name: row.target }, create: { name: row.target } },
          ],
          ...(row.remove ? { disconnect: [{ name: row.remove }] } : {}),
        },
      },
    });
    // 3) 剧集标签（逐集 connectOrCreate，幂等）
    const eps = await prisma.episode.findMany({
      where: { podcastid: row.id },
      select: { episodeid: true },
    });
    for (const e of eps) {
      await prisma.episode.update({
        where: { episodeid: e.episodeid },
        data: {
          tags: {
            connectOrCreate: [
              { where: { name: row.target }, create: { name: row.target } },
            ],
          },
        },
      });
    }
    console.log(
      `[ok] ${row.title}: difficulty×${r.count} → ${row.target}，剧集标签 +${row.target} ×${eps.length}`,
    );
  }

  // ── 第三步：回读断言 ──
  let problems = 0;
  for (const row of checked) {
    const p = await prisma.podcast.findUnique({
      where: { podcastid: row.id },
      select: { title: true, tags: { select: { name: true } } },
    });
    const names = p!.tags.map((t) => t.name);
    const badDiff = await prisma.episode.findFirst({
      where: { podcastid: row.id, NOT: { difficulty: row.target } },
      select: { episodeid: true },
    });
    const noTag = await prisma.episode.findFirst({
      where: { podcastid: row.id, tags: { none: { name: row.target } } },
      select: { episodeid: true },
    });
    const errs: string[] = [];
    if (badDiff) errs.push("存在未更新难度的剧集");
    if (noTag) errs.push(`存在未挂 ${row.target} 标签的剧集`);
    if (!names.includes(row.target)) errs.push(`频道缺 ${row.target} 标签`);
    if (row.remove && names.includes(row.remove))
      errs.push(`仍含 ${row.remove}`);
    if (names.length > 6) errs.push(`频道标签超过 6 个`);
    if (errs.length) problems++;
    console.log(
      `${errs.length ? "✗" : "✓"} ${p!.title}: 难度=${row.target}，标签[${names.join("、")}]${errs.length ? " ← " + errs.join("；") : ""}`,
    );
  }
  if (problems) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
