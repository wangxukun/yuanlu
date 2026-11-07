/**
 * scripts/tmp-clips-audit.ts — clips 三库现状只读审计（DB + OSS 对账）
 *
 * 只读：SELECT / list，零写入。跑法：npx tsx scripts/tmp-clips-audit.ts
 */
import * as fs from "node:fs";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

import { isJunkClip } from "../core/studio/curator.core";

function pct(n: number, d: number) {
  return d > 0 ? ((n / d) * 100).toFixed(1) + "%" : "0%";
}
function bucketize<T>(vals: T[], edges: number[], label: (t: T) => number) {
  const out = edges.map(() => 0);
  for (const v of vals) {
    const x = label(v);
    let i = 0;
    while (i < edges.length && x >= edges[i]) i++;
    out[Math.min(i, edges.length - 1)]++;
  }
  return out;
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const OSS = (await import("ali-oss")).default;

  console.log("━━━ A. 剧集面（语料源覆盖） ━━━");
  const [epTotal, epWithSubs] = await Promise.all([
    prisma.episode.count({ where: { status: "published" } }),
    prisma.episode.count({
      where: { status: "published", subtitleBilingualUrl: { not: null } },
    }),
  ]);
  console.log(
    `已发布剧集 ${epTotal} 集，带双语字幕 ${epWithSubs} 集（覆盖率 ${pct(epWithSubs, epTotal)}）`,
  );

  console.log("\n━━━ B. corpus_clips（句级切片索引） ━━━");
  const clipTotal = await prisma.corpus_clips.count();
  const clipEpisodes = await prisma.corpus_clips.groupBy({
    by: ["episodeid"],
    _count: { _all: true },
  });
  const clipAgg = await prisma.corpus_clips.aggregate({
    _min: {
      duration: true,
      wpm: true,
      wordCount: true,
      updatedAt: true,
      createdAt: true,
    },
    _max: { duration: true, wpm: true, wordCount: true, updatedAt: true },
    _avg: { duration: true, wpm: true, wordCount: true },
  });
  const clipKeyed = await prisma.corpus_clips.count({
    where: { clipAudioKey: { not: null } },
  });
  console.log(
    `切片总数 ${clipTotal} 条，覆盖 ${clipEpisodes.length} 集，均 ${Math.round(clipTotal / Math.max(1, clipEpisodes.length))} 条/集`,
  );
  console.log(
    `clipAudioKey 已回填 ${clipKeyed} 条（${pct(clipKeyed, clipTotal)}——其余为懒切片未播放过）`,
  );
  console.log(
    `时长 avg=${clipAgg._avg.duration.toFixed(1)}s min=${clipAgg._min.duration}s max=${clipAgg._max.duration}s`,
  );
  console.log(
    `语速 wpm avg=${Math.round(clipAgg._avg.wpm)} min=${clipAgg._min.wpm} max=${clipAgg._max.wpm}；词数 avg=${clipAgg._avg.wordCount.toFixed(1)} max=${clipAgg._max.wordCount}`,
  );
  console.log(
    `建库窗口：createdAt ${clipAgg._min.createdAt?.toISOString()} ~ updatedAt ${clipAgg._max.updatedAt?.toISOString()}`,
  );

  // 全量轻字段拉取做分布与质量门禁回放（不含 wordsJson，量可控）
  const clipRows = await prisma.corpus_clips.findMany({
    select: { enText: true, duration: true, wpm: true, wordCount: true },
  });
  const durBuckets = bucketize(
    clipRows,
    [3, 8, 15, 35, 1000],
    (r) => r.duration,
  );
  console.log(
    `时长分布：<3s ${durBuckets[0]} / 3-8s ${durBuckets[1]} / 8-15s ${durBuckets[2]} / 15-35s ${durBuckets[3]} / >35s ${durBuckets[4]}`,
  );
  const wpmBuckets = bucketize(
    clipRows,
    [1, 90, 150, 200, 240, 1e9],
    (r) => r.wpm,
  );
  console.log(
    `语速分布：0 ${wpmBuckets[0]} / <90 ${wpmBuckets[1]} / 90-150 ${wpmBuckets[2]} / 150-200 ${wpmBuckets[3]} / 200-240 ${wpmBuckets[4]} / >240 ${wpmBuckets[5]}`,
  );
  const wcBuckets = bucketize(
    clipRows,
    [4, 5, 10, 19, 30, 1e9],
    (r) => r.wordCount,
  );
  console.log(
    `词数分布：<4 ${wcBuckets[0]} / 4 ${wcBuckets[1]} / 5-9 ${wcBuckets[2]} / 10-18 ${wcBuckets[3]} / 19-30 ${wcBuckets[4]} / >30 ${wcBuckets[5]}`,
  );
  const junk = clipRows.filter((r) => isJunkClip(r)).length;
  console.log(
    `质量门禁回放（isJunkClip：词数≥5+功能词+3-40s+90-240wpm）：不过关 ${junk} 条（${pct(junk, clipTotal)}，重灌库可清除）`,
  );

  console.log("\n━━━ C. micro_scenes（微剧场） ━━━");
  const sceneTotal = await prisma.micro_scenes.count();
  const sceneEpisodes = await prisma.micro_scenes.groupBy({
    by: ["episodeid"],
    _count: { _all: true },
  });
  const sceneAgg = await prisma.micro_scenes.aggregate({
    _min: { duration: true },
    _max: { duration: true },
    _avg: { duration: true },
  });
  const sceneKeyed = await prisma.micro_scenes.count({
    where: { clipAudioKey: { not: null } },
  });
  const sceneWithDive = await prisma.micro_scenes.count({
    where: { deepDiveJson: { not: null } },
  });
  const sceneRows = await prisma.micro_scenes.findMany({
    select: { title: true, situationTag: true, duration: true },
  });
  const fallbackTitles = sceneRows.filter((r) =>
    /^微剧场 \d+s$/.test(r.title),
  ).length;
  const tagCounts = new Map<string, number>();
  sceneRows.forEach((r) => {
    const t = r.situationTag || "(无标签)";
    tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
  });
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  console.log(
    `微剧场总数 ${sceneTotal} 段，覆盖 ${sceneEpisodes.length} 集，均 ${Math.round(sceneTotal / Math.max(1, sceneEpisodes.length))} 段/集`,
  );
  console.log(
    `时长 avg=${sceneAgg._avg.duration.toFixed(1)}s min=${sceneAgg._min.duration}s max=${sceneAgg._max.duration}s`,
  );
  console.log(
    `clipAudioKey 已回填 ${sceneKeyed}（${pct(sceneKeyed, sceneTotal)}）；deepDiveJson 已挂 ${sceneWithDive}（${pct(sceneWithDive, sceneTotal)}）`,
  );
  console.log(
    `净化回落标题「微剧场 Ns」：${fallbackTitles}（${pct(fallbackTitles, sceneTotal)}）`,
  );
  console.log(
    `situationTag Top：${topTags.map(([t, n]) => `${t} ${n}`).join(" / ")}`,
  );

  // 集覆盖交叉：有切片无场景 / 有场景无切片
  const clipEpSet = new Set(clipEpisodes.map((g) => g.episodeid));
  const sceneEpSet = new Set(sceneEpisodes.map((g) => g.episodeid));
  let clipsNoScene = 0;
  clipEpSet.forEach((e) => {
    if (!sceneEpSet.has(e)) clipsNoScene++;
  });
  let sceneNoClips = 0;
  sceneEpSet.forEach((e) => {
    if (!clipEpSet.has(e)) sceneNoClips++;
  });
  console.log(
    `覆盖交叉：有切片无微剧场 ${clipsNoScene} 集 / 有微剧场无切片 ${sceneNoClips} 集 / 有字幕但两表皆空 ${Math.max(0, epWithSubs - new Set([...clipEpSet, ...sceneEpSet]).size)} 集`,
  );

  console.log("\n━━━ D. OSS yuanlu/clips/（物理切片缓存） ━━━");
  const client = new OSS({
    region: process.env.OSS_REGION!,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
    bucket: process.env.OSS_BUCKET!,
    secure: true,
  });
  const objs: { name: string; size: number; lastModified: Date }[] = [];
  let marker: string | undefined;
  do {
    const res = (await client.list(
      { prefix: "yuanlu/clips/", "max-keys": 1000, marker },
      {},
    )) as {
      objects?: Array<{
        name: string;
        size: number;
        lastModified: string | number | Date;
      }>;
      nextMarker?: string;
    };
    for (const o of res.objects || [])
      objs.push({
        name: o.name,
        size: o.size,
        lastModified: new Date(o.lastModified),
      });
    marker = res.nextMarker as string | undefined;
  } while (marker);
  const totalBytes = objs.reduce((s, o) => s + o.size, 0);
  const sizes = objs.map((o) => o.size).sort((a, b) => a - b);
  const med = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 0;
  const byMonth = new Map<string, number>();
  objs.forEach((o) => {
    const k = o.lastModified.toISOString().slice(0, 7);
    byMonth.set(k, (byMonth.get(k) || 0) + 1);
  });
  console.log(
    `对象总数 ${objs.length} 个，总大小 ${(totalBytes / 1024 / 1024).toFixed(1)} MB`,
  );
  console.log(
    `单对象大小：min ${(sizes[0] / 1024).toFixed(1)}KB / 中位 ${(med / 1024).toFixed(1)}KB / max ${(sizes[sizes.length - 1] / 1024).toFixed(1)}KB；>280KB ${sizes.filter((s) => s > 280 * 1024).length} 个`,
  );
  console.log(
    `生成月份分布：${[...byMonth.entries()]
      .sort()
      .map(([k, n]) => `${k} ${n}`)
      .join(" / ")}`,
  );

  console.log("\n━━━ E. DB ↔ OSS 对账 ━━━");
  // DB 回填 key 集合（全量两表）
  const clipKeys = (
    await prisma.corpus_clips.findMany({
      where: { clipAudioKey: { not: null } },
      select: { clipAudioKey: true },
    })
  ).map((r) => r.clipAudioKey as string);
  const sceneKeys = (
    await prisma.micro_scenes.findMany({
      where: { clipAudioKey: { not: null } },
      select: { clipAudioKey: true },
    })
  ).map((r) => r.clipAudioKey as string);
  const dbKeySet = new Set([...clipKeys, ...sceneKeys]);
  const ossKeySet = new Set(objs.map((o) => o.name));
  let dbMissingInOss = 0;
  dbKeySet.forEach((k) => {
    if (!ossKeySet.has(k)) dbMissingInOss++;
  });
  const ossOrphans = objs.filter((o) => !dbKeySet.has(o.name));
  const orphanBytes = ossOrphans.reduce((s, o) => s + o.size, 0);
  console.log(`DB 已回填 key ${dbKeySet.size} 个；OSS 对象 ${objs.length} 个`);
  console.log(
    `DB 回填但 OSS 缺失（重灌库后旧对象被生命周期清理/未及回填）：${dbMissingInOss} 个`,
  );
  console.log(
    `OSS 孤儿对象（DB 无回填记录——重灌库换 id 或微剧场 deleteMany 重建）：${ossOrphans.length} 个（${(orphanBytes / 1024 / 1024).toFixed(1)} MB，${pct(ossOrphans.length, objs.length)}）`,
  );
  if (ossOrphans.length > 0) {
    const orphanScenes = ossOrphans.filter(
      (o) => !/\.mp3$/.test(o.name) === false,
    ).length;
    console.log(
      `  孤儿样例：${ossOrphans
        .slice(0, 3)
        .map((o) => o.name.split("/").pop())
        .join(", ")}`,
    );
    console.log(
      `  （微剧场 deleteMany+createMany 重建会换 sceneid → 旧场景音频全部成孤儿，占 ${pct(ossOrphans.filter((o) => o.name.includes(".mp3")).length, objs.length)} 视样例 id 前缀而定）`,
    );
    void orphanScenes;
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("审计失败：", e);
  process.exit(1);
});
