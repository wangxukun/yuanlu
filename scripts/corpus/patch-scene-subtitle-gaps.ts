/**
 * [2026-11-11 存量修补] 微场景字幕补洞——把建库时被句级门禁（minDuration/
 * minWords/junkGate）丢弃、但仍落在场景 [startTime, endTime] 物理音频窗内的
 * 字幕行补回 clipsJson（复用 clip-core.backfillSceneSubtitleGaps 同一函数，
 * 口径与建库脚本完全一致）。
 *
 * 背景：场景音频切整窗，组桶只吃过门禁的行 → 窗中洞句「有声无字幕」
 * （实测病例：窗口 228.6-261.0s 内 #44/45/46/48 被丢，最大洞 7.59s）。
 *
 * 只 UPDATE clipsJson：sceneid/sceneKey/startTime/endTime/duration/标题/
 * summary 全不动 → embeddingZh（按 sceneid 灌）与 OSS 懒切片缓存零作废。
 * 补行 clipid=null（无独立切片）、排除纯语气词（Yeah./Uh 一闪而过）。
 *
 * 用法：
 *   npx tsx scripts/corpus/patch-scene-subtitle-gaps.ts --dry   # 摸底不落库
 *   npx tsx scripts/corpus/patch-scene-subtitle-gaps.ts          # 全量修补
 *   npx tsx scripts/corpus/patch-scene-subtitle-gaps.ts --episode=<id>
 *   npx tsx scripts/corpus/patch-scene-subtitle-gaps.ts --limit=20
 */
import * as fs from "node:fs";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

import {
  backfillSceneSubtitleGaps,
  type SceneClipRef,
  type SubtitleItem,
} from "../../core/corpus/clip-core";

interface Args {
  dry: boolean;
  episode: string | null;
  limit: number;
}

function parseArgs(): Args {
  const args: Args = { dry: false, episode: null, limit: 0 };
  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry") args.dry = true;
    else if (arg.startsWith("--episode=")) args.episode = arg.slice(10);
    else if (arg.startsWith("--limit=")) args.limit = Number(arg.slice(8)) || 0;
  }
  return args;
}

function ossKeyFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\//, "");
  } catch {
    return url;
  }
}

async function main() {
  const args = parseArgs();
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const { generateSignatureUrl } = await import("../../lib/oss");
  const subCache = new Map<string, SubtitleItem[] | null>();

  const fetchSubs = async (url: string): Promise<SubtitleItem[] | null> => {
    if (subCache.has(url)) return subCache.get(url)!;
    let out: SubtitleItem[] | null = null;
    try {
      const key = ossKeyFromUrl(url);
      const signed = url.startsWith("http")
        ? await generateSignatureUrl(key, 600)
        : url;
      const res = await fetch(signed || url, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0)
          out = json as SubtitleItem[];
      }
    } catch {
      out = null;
    }
    subCache.set(url, out);
    return out;
  };

  try {
    // 有场景的剧集（可指定单集 / 限量摸底）
    const grouped = await prisma.micro_scenes.groupBy({
      by: ["episodeid"],
      ...(args.episode ? { where: { episodeid: args.episode } } : {}),
      _count: { _all: true },
    });
    let epIds = grouped.map((g) => g.episodeid);
    const sceneTotal = grouped.reduce((s, g) => s + g._count._all, 0);
    if (args.limit > 0) epIds = epIds.slice(0, args.limit);

    console.log(
      `[patch-scene-gaps] 剧集 ${epIds.length}/${grouped.length} 集（场景 ${sceneTotal} 个）${args.dry ? "（dry 摸底，不落库）" : ""}`,
    );

    const eps = await prisma.episode.findMany({
      where: { episodeid: { in: epIds } },
      select: { episodeid: true, title: true, subtitleBilingualUrl: true },
    });
    const epByUrl = new Map(eps.map((e) => [e.episodeid, e]));

    let epsWithHoles = 0;
    let scenesPatched = 0;
    let rowsAdded = 0;

    for (const epId of epIds) {
      const ep = epByUrl.get(epId);
      if (!ep?.subtitleBilingualUrl) continue;
      const subs = await fetchSubs(ep.subtitleBilingualUrl);
      if (!subs) {
        console.warn(`  ⚠ ${ep.title}: 字幕拉取失败，跳过`);
        continue;
      }
      const scenes = await prisma.micro_scenes.findMany({
        where: { episodeid: epId },
        select: {
          sceneid: true,
          sceneKey: true,
          startTime: true,
          endTime: true,
          clipsJson: true,
        },
        orderBy: { startTime: "asc" },
      });

      let epRows = 0;
      let epScenes = 0;
      for (const row of scenes) {
        const before = row.clipsJson as { clips?: SceneClipRef[] } | null;
        const scene = {
          startTime: row.startTime,
          endTime: row.endTime,
          clips: (before?.clips || []).map((c) => ({ ...c })),
        };
        const beforeCount = scene.clips.length;
        backfillSceneSubtitleGaps([scene], subs);
        const added = scene.clips.length - beforeCount;
        if (added <= 0) continue;

        epRows += added;
        epScenes += 1;
        scenesPatched += 1;
        rowsAdded += added;
        if (!args.dry) {
          await prisma.micro_scenes.update({
            where: { sceneid: row.sceneid },
            data: { clipsJson: { clips: scene.clips } as object },
          });
        }
      }
      if (epRows > 0) {
        epsWithHoles += 1;
        console.log(`  ✓ ${ep.title}: ${epScenes} 场景补 ${epRows} 行`);
      }
    }

    console.log(
      `\n[patch-scene-gaps] 完成：${epsWithHoles} 集有洞 / ${scenesPatched} 场景补行 / 共补 ${rowsAdded} 句${args.dry ? "（dry 未落库）" : ""}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[patch-scene-gaps] 失败：", err);
  process.exit(1);
});
