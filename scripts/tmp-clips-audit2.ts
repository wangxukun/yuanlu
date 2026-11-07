/**
 * scripts/tmp-clips-audit2.ts — 追查 A：728 集有字幕未入库的原因
 * 1) 按 publishAt 分组：建库日(2026-10-28)前/后发布；
 * 2) 抽样 5 集直接现签拉双语字幕 JSON 验证可用性；
 * 3) episode_deep_dives 总量（微剧场 deepDiveJson 1.7% 的源头上限）。
 * 只读。
 */
import * as fs from "node:fs";
for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  const indexed = new Set(
    (
      await prisma.corpus_clips.groupBy({
        by: ["episodeid"],
        _count: { _all: true },
      })
    )
      .filter((g) => g._count._all > 0)
      .map((g) => g.episodeid),
  );
  const unindexed = await prisma.episode.findMany({
    where: {
      status: "published",
      subtitleBilingualUrl: { not: null },
      episodeid: { notIn: [...indexed] },
    },
    select: {
      episodeid: true,
      title: true,
      publishAt: true,
      subtitleBilingualUrl: true,
      podcast: { select: { title: true } },
    },
    orderBy: { publishAt: "desc" },
  });
  console.log(`未入库（有字幕、corpus 两表皆空）：${unindexed.length} 集`);
  const before = unindexed.filter(
    (e) => new Date(e.publishAt) < new Date("2026-10-28"),
  ).length;
  const after = unindexed.length - before;
  console.log(
    `  按发布时间：2026-10-28（首次建库日）之前发布 ${before} 集 / 之后发布 ${after} 集`,
  );
  const byPodcast = new Map<string, number>();
  unindexed.forEach((e) =>
    byPodcast.set(
      e.podcast?.title || "?",
      (byPodcast.get(e.podcast?.title || "?") || 0) + 1,
    ),
  );
  console.log(
    `  按节目分布 Top10：${[...byPodcast.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([t, n]) => `${t} ${n}`)
      .join(" / ")}`,
  );

  // 抽样验证字幕可用性（最新 2 集 + 最旧 2 集 + 随机 1 集）
  const { generateSignatureUrl } = await import("../lib/oss");
  const sample = [
    unindexed[0],
    unindexed[1],
    unindexed[unindexed.length - 1],
    unindexed[unindexed.length - 2],
    unindexed[Math.floor(unindexed.length / 2)],
  ].filter(Boolean);
  for (const ep of sample) {
    try {
      const url = ep.subtitleBilingualUrl!;
      const key = url.startsWith("http")
        ? new URL(url).pathname.replace(/^\//, "")
        : url;
      const signed = await generateSignatureUrl(key, 60);
      const res = await fetch(signed, { cache: "no-store" });
      if (!res.ok) {
        console.log(`  ✗ 《${ep.title}》字幕拉取 HTTP ${res.status}`);
        continue;
      }
      const json = await res.json();
      const arr = Array.isArray(json) ? json : null;
      console.log(
        `  ${arr ? "✓" : "✗"} 《${ep.title}》（${ep.podcast?.title}，发布 ${ep.publishAt.toISOString().slice(0, 10)}）字幕 ${Array.isArray(json) ? json.length + " 句" : "非数组结构: " + typeof json}`,
      );
    } catch (e) {
      console.log(`  ✗ 《${ep.title}》异常：${(e as Error).message}`);
    }
  }

  // deep-dive 源头
  const diveTotal = await prisma.episode_deep_dives.count();
  const diveInIndexed = await prisma.episode_deep_dives.count({
    where: { episodeid: { in: [...indexed] } },
  });
  console.log(
    `\nepisode_deep_dives 全库 ${diveTotal} 集，其中在已入库 1445 集内 ${diveInIndexed} 集（微剧场 deepDiveJson 挂载率的源头上限）`,
  );

  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
