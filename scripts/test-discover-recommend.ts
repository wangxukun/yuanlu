/**
 * 发现页「为您推荐」统一推荐逻辑只读自检：
 *   npx tsx scripts/test-discover-recommend.ts [userid]
 *
 * 1) 打印匿名（全局）推荐 Top10 及关键信号构成
 * 2) 传入 userid（缺省时自动挑一个有收藏记录的用户）打印个性化结果与差异
 * 3) 校验不变量：两次调用结果一致（固定排序）、推荐集合恰为 ranked 前 N 个、
 *    推荐窗内同平台 ≤2 个、已收藏播客不出现
 */
import * as fs from "node:fs";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

import type { PrismaClient } from "@prisma/client";

type Ranking = Awaited<
  ReturnType<typeof import("@/lib/discover-recommend").getDiscoverRanking>
>;

let prisma: PrismaClient;

function printTop(label: string, ranking: Ranking, limit: number) {
  console.log(
    `\n=== ${label}（池 ${ranking.ranked.length}，推荐 ${ranking.recommendedIds.size}） ===`,
  );
  ranking.ranked.slice(0, limit).forEach((p, i) => {
    const mark = ranking.recommendedIds.has(p.podcastid) ? "*" : " ";
    console.log(
      [
        `${mark}${String(i + 1).padStart(2)}`,
        `score=${p.score.toFixed(1).padStart(6)}`,
        `pick=${p.isEditorPick ? "Y" : "n"}`,
        `plays=${String(p.totalPlays).padStart(6)}`,
        `eps=${String(p.episodeCount).padStart(3)}`,
        `lastPub=${p.lastPublishAt ? p.lastPublishAt.toISOString().slice(0, 10) : "none"}`,
        `${(p.platform || "-").slice(0, 22)}`,
        p.title.slice(0, 24),
      ].join(" | "),
    );
  });
}

async function checkInvariants(ranking: Ranking, limit: number) {
  const problems: string[] = [];

  const ids = ranking.ranked.map((p) => p.podcastid);
  if (new Set(ids).size !== ids.length) problems.push("ranked 存在重复 id");

  const windowIds = ids.slice(0, ranking.recommendedIds.size);
  if (
    windowIds.some((id) => !ranking.recommendedIds.has(id)) ||
    ranking.ranked
      .slice(ranking.recommendedIds.size)
      .some((p) => ranking.recommendedIds.has(p.podcastid))
  ) {
    problems.push("推荐集合与 ranked 前 N 位不一致");
  }

  const platformCount = new Map<string, number>();
  for (const p of ranking.ranked.slice(0, ranking.recommendedIds.size)) {
    const key = p.platform || "";
    platformCount.set(key, (platformCount.get(key) ?? 0) + 1);
  }
  const over = [...platformCount].filter(([, n]) => n > 2);
  if (over.length > 0)
    problems.push(
      `推荐窗内平台超限: ${over.map(([k, n]) => `${k || "无平台"}×${n}`).join(",")}`,
    );

  if (ranking.recommendedIds.size !== Math.min(limit, ranking.ranked.length))
    problems.push(
      `推荐集合大小 ${ranking.recommendedIds.size} != min(limit, pool)=${Math.min(limit, ranking.ranked.length)}`,
    );

  return problems;
}

async function main() {
  const { getDiscoverRanking, DISCOVER_RECOMMEND_LIMIT } = await import(
    "@/lib/discover-recommend"
  );
  prisma = (await import("@/lib/prisma")).default;

  // ── 匿名（全局）排序 + 确定性 ──
  const [anon1, anon2] = await Promise.all([
    getDiscoverRanking(undefined, DISCOVER_RECOMMEND_LIMIT),
    getDiscoverRanking(undefined, DISCOVER_RECOMMEND_LIMIT),
  ]);
  printTop("匿名（全局）", anon1, 10);

  const deterministic =
    anon1.ranked.map((p) => p.podcastid).join() ===
    anon2.ranked.map((p) => p.podcastid).join();
  console.log(
    `\n确定性（两次调用顺序一致）: ${deterministic ? "PASS" : "FAIL"}`,
  );

  const problems = await checkInvariants(anon1, DISCOVER_RECOMMEND_LIMIT);
  if (!deterministic) problems.push("排序不确定");

  // ── 个性化（指定 userid 或自动挑一个有收藏的用户） ──
  let userId: string | undefined = process.argv[2];
  if (!userId) {
    const fav = await prisma.podcast_favorites.findFirst({
      select: { userid: true },
    });
    userId = fav?.userid ?? undefined;
  }

  if (userId) {
    const favorited = await prisma.podcast_favorites.findMany({
      where: { userid: userId },
      select: { podcastid: true },
    });
    const personalized = await getDiscoverRanking(
      userId,
      DISCOVER_RECOMMEND_LIMIT,
    );
    printTop(
      `个性化 userid=${userId}（收藏 ${favorited.length} 个）`,
      personalized,
      10,
    );

    const leaked = personalized.ranked
      .slice(0, personalized.recommendedIds.size)
      .filter((p) => favorited.some((f) => f.podcastid === p.podcastid));
    if (leaked.length > 0)
      problems.push(
        `个性化推荐窗内出现已收藏: ${leaked.map((p) => p.title).join(",")}`,
      );

    const anonTop = anon1.ranked
      .slice(0, DISCOVER_RECOMMEND_LIMIT)
      .map((p) => p.podcastid);
    const perTop = personalized.ranked
      .slice(0, personalized.recommendedIds.size)
      .map((p) => p.podcastid);
    console.log(
      `与匿名全局的差集（个性化生效情况）: 新进 ${perTop.filter((id) => !anonTop.includes(id)).length} 个`,
    );

    problems.push(
      ...(await checkInvariants(personalized, DISCOVER_RECOMMEND_LIMIT)),
    );
  } else {
    console.log("\n（无 userid 参数且库中无收藏记录，跳过个性化用例）");
  }

  console.log(`\n不变量校验: ${problems.length === 0 ? "PASS" : "FAIL"}`);
  for (const p of problems) console.log(`  - ${p}`);

  if (problems.length > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma?.$disconnect();
  });
