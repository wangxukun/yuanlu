/**
 * 主页「为你推荐」统一剧集推荐逻辑只读自检：
 *   npx tsx scripts/test-home-recommend.ts [userid]
 *
 * 1) 打印匿名（全局）推荐 Top10 及关键信号构成
 * 2) 传入 userid（缺省时自动挑一个有收听记录的用户）打印个性化结果与差异
 * 3) 校验不变量：两次调用结果一致（固定排序）、头部 12 名内同播客 ≤2、
 *    已看完/已收藏剧集不出现、排名无重复
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
  ReturnType<
    typeof import("@/lib/episode-recommend").getRecommendedEpisodeRanking
  >
>;

let prisma: PrismaClient;

function printTop(label: string, ranking: Ranking, limit: number) {
  console.log(
    `\n=== ${label}（候选 ${ranking.ranked.length}，等级 label=${ranking.level.label}，目标档=[${ranking.level.targetDifficulties.join(",")}]） ===`,
  );
  ranking.ranked.slice(0, limit).forEach((ep, i) => {
    console.log(
      [
        `${String(i + 1).padStart(2)}`,
        `score=${ep.score.toFixed(1).padStart(6)}`,
        `plays=${String(ep.playCount).padStart(6)}`,
        `diff=${(ep.difficulty || "-").padEnd(8)}`,
        `pub=${ep.publishAt.toISOString().slice(0, 10)}`,
        `${(ep.podcast?.title || "单集").slice(0, 22)}`,
        ep.title.slice(0, 26),
      ].join(" | "),
    );
  });
}

async function checkInvariants(ranking: Ranking): Promise<string[]> {
  const problems: string[] = [];

  const ids = ranking.ranked.map((ep) => ep.episodeid);
  if (new Set(ids).size !== ids.length) problems.push("ranked 存在重复 id");

  const perPodcast = new Map<string, number>();
  for (const ep of ranking.ranked.slice(0, 12)) {
    const key = ep.podcast?.podcastid ?? "";
    perPodcast.set(key, (perPodcast.get(key) ?? 0) + 1);
  }
  const over = [...perPodcast].filter(([, n]) => n > 2);
  if (over.length > 0)
    problems.push(
      `头部 12 名内同播客超限: ${over.map(([k, n]) => `${k || "无播客"}×${n}`).join(",")}`,
    );

  return problems;
}

async function main() {
  const { getRecommendedEpisodeRanking } = await import(
    "@/lib/episode-recommend"
  );
  prisma = (await import("@/lib/prisma")).default;

  // ── 匿名（全局）排序 + 确定性 ──
  const [anon1, anon2] = await Promise.all([
    getRecommendedEpisodeRanking(undefined),
    getRecommendedEpisodeRanking(undefined),
  ]);
  printTop("匿名（全局）", anon1, 10);

  const deterministic =
    anon1.ranked.map((ep) => ep.episodeid).join() ===
    anon2.ranked.map((ep) => ep.episodeid).join();
  console.log(
    `\n确定性（两次调用顺序一致）: ${deterministic ? "PASS" : "FAIL"}`,
  );

  const problems = await checkInvariants(anon1);
  if (!deterministic) problems.push("排序不确定");

  // ── 个性化（指定 userid 或自动挑一个有收听记录的用户） ──
  let userId: string | undefined = process.argv[2];
  if (!userId) {
    const h = await prisma.listening_history.findFirst({
      select: { userid: true },
    });
    userId = h?.userid ?? undefined;
  }

  if (userId) {
    const [history, favorites] = await Promise.all([
      prisma.listening_history.findMany({
        where: { userid: userId },
        select: { episodeid: true, isFinished: true },
      }),
      prisma.episode_favorites.findMany({
        where: { userid: userId },
        select: { episodeid: true },
      }),
    ]);
    const excluded = new Set<string>([
      ...history.filter((h) => h.isFinished).map((h) => h.episodeid ?? ""),
      ...favorites.map((f) => f.episodeid ?? ""),
    ]);
    excluded.delete("");

    const personalized = await getRecommendedEpisodeRanking(userId);
    printTop(
      `个性化 userid=${userId}（收听 ${history.length} 条其中看完 ${history.filter((h) => h.isFinished).length}，收藏剧集 ${favorites.length}）`,
      personalized,
      10,
    );

    const leaked = personalized.ranked.filter((ep) =>
      excluded.has(ep.episodeid),
    );
    if (leaked.length > 0)
      problems.push(
        `个性化排序中出现已看完/已收藏剧集 ${leaked.length} 条（如 ${leaked[0].title}）`,
      );

    const anonTop = anon1.ranked.slice(0, 4).map((ep) => ep.episodeid);
    const perTop = personalized.ranked.slice(0, 4).map((ep) => ep.episodeid);
    console.log(
      `与匿名全局的差集（个性化生效情况）: 前 4 中新进 ${perTop.filter((id) => !anonTop.includes(id)).length} 个`,
    );

    problems.push(...(await checkInvariants(personalized)));
  } else {
    console.log("\n（无 userid 参数且库中无收听记录，跳过个性化用例）");
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
