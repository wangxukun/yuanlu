/**
 * 一次性脚本：为已发布播客频道添加「美音 / 英音」口音标签
 * 清单来源：推荐清单.md 总表口音标记（2026-10-11 审核通过）
 *   英音 18 档、美音 14 档；满 5 标签的 4 档替换一个冗余标签（disconnect）；
 *   Luke's 将「英式英语」替换为「英音」。
 * 安全：默认干跑——逐条核对 DB 现有标签与预期完全一致才允许 --apply；
 *   任何一条不匹配即整体中止，不写库。connectOrCreate 幂等，可重复运行。
 * 用法：cd D:/WebstormProjects/yuanlu
 *   npx tsx scripts/add-podcast-accent-tags.ts          # 干跑校验
 *   npx tsx scripts/add-podcast-accent-tags.ts --apply  # 实际写入
 */
import prisma from "@/lib/prisma";

type Row = {
  id: string;
  title: string; // DB 中的频道名（展示/人工核对用）
  accent: "英音" | "美音";
  remove?: string; // 需腾位替换掉的冗余标签
  expect: string[]; // 写入前 DB 必须恰好拥有的标签集合
};

const ROWS: Row[] = [
  // ── 英音 · BBC Learning English ──
  {
    id: "cmivwgyal0002dy4ox06ri749",
    title: "Learning Easy English",
    accent: "英音",
    expect: ["日常生活"],
  },
  {
    id: "cmhxl95jl000mdyv8symgylk6",
    title: "6 Minute English",
    accent: "英音",
    expect: ["日常生活", "六分钟英语"],
  },
  {
    id: "cmiuk5l990000dykoguncqfyb",
    title: "Learning English For Work",
    accent: "英音",
    expect: ["商务英语"],
  },
  {
    id: "cmm7me07d0a0rgxn80ssm3baw",
    title: "Learning English Conversations",
    accent: "英音",
    expect: ["日常生活", "英语会话", "地道英语"],
  },
  {
    id: "cmj8c1sjb0000dytw9xy7un8y",
    title: "Learning English Stories",
    accent: "英音",
    expect: ["故事"],
  },
  {
    id: "cmj2yukho0000dy5siiyxvi3x",
    title: "Learning English Grammar",
    accent: "英音",
    expect: ["英语语法"],
  },
  {
    id: "cmmfvgk8p0xqggxn8sjbyqovf",
    title: "Learning English from the News",
    accent: "英音",
    expect: ["新闻"],
  },
  {
    id: "cmmna1i1h04rzgxsfod37cd68",
    title: "Beating Speaking Anxiety",
    accent: "英音",
    expect: ["战胜说话焦虑"],
  },
  {
    id: "cmuwhq1ym01kagxuu4shspun4",
    title: "Learning English Vocabulary",
    accent: "英音",
    expect: ["英语学习", "词汇扩展", "日常英语"],
  },
  // ── 英音 · 其他 ──
  {
    id: "cmat8yz6u000eqassb968qt07",
    title: "English Like A Native",
    accent: "英音",
    expect: ["英语词汇"],
  },
  {
    id: "cmjzubjnv046ggxloqlm8fgq8",
    title: "The Global Story",
    accent: "英音",
    remove: "国际政经",
    expect: ["新闻", "国际政经", "新闻与政治", "每日新闻", "国际时事"],
  },
  {
    id: "cmr0by5ct0jfzgxu04jxag9t4",
    title: "Global News Podcast",
    accent: "英音",
    expect: ["新闻与政治", "每日新闻", "国际时事"],
  },
  {
    id: "cmqxc54j90czvgxu0xt24kd9z",
    title: "Death in Ice Valley",
    accent: "英音",
    expect: ["犯罪纪实", "历史悬案", "深度调查", "冷战间谍"],
  },
  {
    id: "cmqyzjp9i0gkmgxu027nokvq9",
    title: "Dramas",
    accent: "英音",
    expect: ["小说", "戏剧", "历史与叙事"],
  },
  {
    id: "cmr0mvpz60koigxu0kb8bhvik",
    title: "The Food Chain",
    accent: "英音",
    expect: ["饮食文化", "社会与文化", "商业与经济"],
  },
  {
    id: "cmqx7f1sn0c62gxu0zzc29pzp",
    title: "The Dark Is Rising",
    accent: "英音",
    expect: ["故事", "小说"],
  },
  {
    id: "cmqwfi6c80bb6gxu0mo4q0ech",
    title: "What in the World",
    accent: "英音",
    expect: ["新闻"],
  },
  {
    id: "cmuyapoc500j4gxuxz5cio2kz",
    title: "Luke's ENGLISH Podcast - Learn British English with Luke Thompson",
    accent: "英音",
    remove: "英式英语",
    expect: ["英式英语", "播客学习", "语言学习", "听力训练"],
  },
  // ── 美音 · VOA Learning English ──
  {
    id: "cmo1mbn2c0fevgxp8o6namchh",
    title: "Words & Their Stories",
    accent: "美音",
    expect: ["词汇故事"],
  },
  {
    id: "cmo3w2ju502i6gxgw82umie11",
    title: "Everyday Grammar",
    accent: "美音",
    expect: ["英语语法"],
  },
  {
    id: "cmo06w4hr0agvgxp8s633o6ej",
    title: "Science & Technology",
    accent: "美音",
    expect: ["科学与技术"],
  },
  {
    id: "cmo8gsxt807digxqz5u5lfk4w",
    title: "Arts & Culture",
    accent: "美音",
    expect: ["艺术与文化"],
  },
  {
    id: "cmo4j329h05c0gxgw1uuqmnv8",
    title: "Health & Lifestyle",
    accent: "美音",
    expect: ["健康与生活"],
  },
  {
    id: "cmpo4vmba0cllgx3fo0vymjsf",
    title: "Ask a Teacher",
    accent: "美音",
    expect: ["名师答疑"],
  },
  {
    id: "cmuxqf7vm00dmgx4dyb92u0ue",
    title: "As It Is - VOA Learning English",
    accent: "美音",
    expect: ["英语学习", "文化探索", "新闻听力", "VOA Learning English"],
  },
  {
    id: "cmv3di3uo06yxgxbqwc3z4k9n",
    title: "U.S. History - VOA Learning English",
    accent: "美音",
    expect: ["英语学习", "美国历史", "历史文化", "VOA Learning English"],
  },
  // ── 美音 · 其他 ──
  {
    id: "cmk2m21dc016cgxb1sjshx7q1",
    title: "The Daily",
    accent: "美音",
    expect: ["新闻"],
  },
  {
    id: "cmrm8qg1o1483gxu0g1qc327c",
    title: "CNN 5 Good Things",
    accent: "美音",
    remove: "社会万象",
    expect: ["人文纪实", "暖心故事", "治愈温暖", "周末精选", "社会万象"],
  },
  {
    id: "cmrm57gfs13r6gxu0q4a1h3v2",
    title: "CNN 5 Things",
    accent: "美音",
    expect: ["每日新闻", "时事速递", "全球头条", "高效通勤"],
  },
  {
    id: "cmr5sfigq0pvqgxu07qj67m6u",
    title: "Up First",
    accent: "美音",
    remove: "通勤必听",
    expect: ["新闻与政治", "每日新闻", "时事速递", "晨间简报", "通勤必听"],
  },
  {
    id: "cmr4yq2ow0oexgxu024976rec",
    title: "StoryCorps",
    accent: "美音",
    expect: ["社会与文化", "人类情感", "个人故事"],
  },
  {
    id: "cmuw77ajd00vtgxuuvvqpwmkq",
    title: "Espresso English Podcast",
    accent: "美音",
    remove: "短语习语",
    expect: ["英语学习", "语法", "词汇", "短语习语", "两分钟英语"],
  },
];

const apply = process.argv.includes("--apply");
const sameSet = (a: string[], b: string[]) =>
  a.length === b.length &&
  [...a].sort().join("\n") === [...b].sort().join("\n");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL 未加载（应在 yuanlu 根目录用 npx tsx 运行）");
  }

  // 第一步：逐条核对（频道存在 + 现有标签与预期完全一致）
  const checked: Array<{ row: Row; before: string[] }> = [];
  let failed = 0;
  for (const row of ROWS) {
    const p = await prisma.podcast.findUnique({
      where: { podcastid: row.id },
      select: { title: true, tags: { select: { name: true } } },
    });
    const names = p ? p.tags.map((t) => t.name) : [];
    const ok = p && sameSet(names, row.expect);
    if (!ok) {
      failed++;
      console.log(
        `✗ ${row.title} (${row.id})\n    DB 标题: ${p?.title ?? "<不存在>"}\n    DB 标签: [${names.join("、")}]\n    预期标签: [${row.expect.join("、")}]`,
      );
    } else {
      checked.push({ row, before: names });
      console.log(
        `✓ ${p!.title} → ${row.accent}${row.remove ? `（替换「${row.remove}」）` : ""} [${names.join("、")}]`,
      );
    }
  }
  if (failed) throw new Error(`${failed} 条核对失败，已整体中止（未写库）`);
  console.log(
    `\n核对通过 ${checked.length}/${ROWS.length} 条。${apply ? "开始写入…" : "（干跑，未写库；加 --apply 执行）"}`,
  );

  // 第二步：写入（connectOrCreate 追加 / disconnect 腾位；仅 --apply 时执行）
  if (!apply) return;
  for (const { row } of checked) {
    await prisma.podcast.update({
      where: { podcastid: row.id },
      data: {
        tags: {
          connectOrCreate: [
            { where: { name: row.accent }, create: { name: row.accent } },
          ],
          ...(row.remove ? { disconnect: [{ name: row.remove }] } : {}),
        },
      },
    });
  }

  // 第三步：回读断言
  for (const { row } of checked) {
    const p = await prisma.podcast.findUnique({
      where: { podcastid: row.id },
      select: {
        title: true,
        tags: { select: { name: true }, orderBy: { name: "asc" } },
      },
    });
    const names = p!.tags.map((t) => t.name);
    const problems: string[] = [];
    if (!names.includes(row.accent)) problems.push(`缺少 ${row.accent}`);
    if (row.remove && names.includes(row.remove))
      problems.push(`仍含 ${row.remove}`);
    if (names.length > 5) problems.push(`超过 5 个标签`);
    console.log(
      `${problems.length ? "✗" : "✓"} ${p!.title}: [${names.join("、")}]${problems.length ? ` ← ${problems.join("；")}` : ""}`,
    );
    if (problems.length) process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
