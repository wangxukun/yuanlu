/**
 * [RESHAPE T1.2] 存量语料离线原子化批处理：npx tsx scripts/build-corpus-index.ts
 *
 * 扫描已发布剧集的双语词级时间戳字幕 JSON（subtitleBilingualUrl）与
 * episode_deep_dives，产出：
 *   corpus_clips  句级切片索引（WPM / ⚡连读词块 / 音素标签 / CEFR / 封面/出处）
 *   micro_scenes  3–6 句 15–40s 微剧场（含 deep-dive 映射）
 *
 * 幂等口径：按剧集 deleteMany + create（两表均为重塑新增表，重跑安全；
 * 不触碰任何既有表数据——网页版零扰动红线）。
 *
 * 用法：
 *   npx tsx scripts/build-corpus-index.ts --limit=20        # 最新 20 集
 *   npx tsx scripts/build-corpus-index.ts --episode=<id>    # 单集重建
 *   npx tsx scripts/build-corpus-index.ts --dry            # 只统计不落库
 * 字幕源：直接 fetch OSS 双语 JSON（mergeSubtitles 同源；无双语字幕的集跳过）。
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
  buildClipsFromSubtitles,
  groupScenes,
  mapDeepDiveIntoScenes,
  type SubtitleItem,
} from "../core/corpus/clip-core";

// 私有桶字幕必须现签后拉取（lib/data.ts data()/mergeSubtitles 同口径；
// 裸 subtitleBilingualUrl 直接 fetch 会 403）。lib/oss 加载期读 env，
// 须在 .env 就绪后于 main 内动态 import（本文件 CJS 格式无顶层 await）。
type Signer = (key: string, expireSec: number) => Promise<string>;

function ossKeyFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\//, "");
  } catch {
    return url;
  }
}

async function fetchBilingualSubtitles(
  url: string,
  sign: Signer,
): Promise<SubtitleItem[] | null> {
  try {
    // 已是相对 key 或裸 URL 一律走签名（sign 对 key 生效；重复签无害）
    const signed = url.startsWith("http")
      ? await sign(ossKeyFromUrl(url), 600)
      : await sign(url, 600);
    const res = await fetch(signed || url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    if (!Array.isArray(json) || json.length === 0) return null;
    return json as SubtitleItem[];
  } catch {
    return null;
  }
}

interface Args {
  limit: number;
  episode: string | null;
  dry: boolean;
}

function parseArgs(): Args {
  const args: Args = { limit: 0, episode: null, dry: false };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--limit=")) args.limit = Number(arg.slice(8)) || 0;
    else if (arg.startsWith("--episode=")) args.episode = arg.slice(10);
    else if (arg === "--dry") args.dry = true;
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const { generateSignatureUrl } = await import("../lib/oss");
  try {
    const episodes = await prisma.episode.findMany({
      where: {
        status: "published",
        ...(args.episode ? { episodeid: args.episode } : {}),
      },
      select: {
        episodeid: true,
        title: true,
        coverUrl: true,
        difficulty: true,
        subtitleBilingualUrl: true,
        podcast: { select: { title: true } },
        tags: { select: { name: true } },
      },
      orderBy: { publishAt: "desc" },
      ...(args.limit > 0 ? { take: args.limit } : {}),
    });

    console.log(
      `[build-corpus-index] 候选剧集 ${episodes.length} 集${args.dry ? "（dry 模式，不落库）" : ""}`,
    );

    let totalClips = 0;
    let totalScenes = 0;
    let skipped = 0;

    for (const ep of episodes) {
      if (!ep.subtitleBilingualUrl) {
        skipped += 1;
        continue;
      }
      const subtitles = await fetchBilingualSubtitles(
        ep.subtitleBilingualUrl,
        generateSignatureUrl,
      );
      if (!subtitles) {
        skipped += 1;
        console.warn(`  ⚠ ${ep.title}: 双语字幕拉取失败/为空，跳过`);
        continue;
      }

      const meta = {
        cefrLevel: ep.difficulty || null,
        coverUrl: ep.coverUrl || null,
        sourceLabel: ep.podcast?.title || null,
        topicTags: ep.tags.map((t) => t.name),
      };

      const drafts = buildClipsFromSubtitles(ep.episodeid, subtitles);
      const scenes = groupScenes(ep.episodeid, drafts);

      console.log(
        `  ✓ ${ep.title}: 字幕 ${subtitles.length} 句 → 切片 ${drafts.length} / 微剧场 ${scenes.length}`,
      );
      totalClips += drafts.length;
      totalScenes += scenes.length;
      if (args.dry) continue;

      // 幂等重建（仅新增表）：先删后建
      await prisma.corpus_clips.deleteMany({
        where: { episodeid: ep.episodeid },
      });
      await prisma.micro_scenes.deleteMany({
        where: { episodeid: ep.episodeid },
      });

      const created = await prisma.corpus_clips.createMany({
        data: drafts.map((d) => ({
          ...d,
          ...meta,
          wordsJson: (d.wordsJson ?? undefined) as object | undefined,
          acousticFlags: (d.acousticFlags ?? undefined) as object | undefined,
        })),
      });

      // createMany 后回读拿 clipid（cuid 由库侧生成），再组装微剧场
      const inserted = await prisma.corpus_clips.findMany({
        where: { episodeid: ep.episodeid },
        select: { clipid: true, subtitleId: true },
      });
      const idBySubtitle = new Map(
        inserted.map((c) => [c.subtitleId, c.clipid]),
      );

      const deepDiveRow = await prisma.episode_deep_dives.findUnique({
        where: { episodeid: ep.episodeid },
        select: { content: true },
      });
      const deepDiveMapped = mapDeepDiveIntoScenes(
        scenes,
        (deepDiveRow?.content ?? null) as never,
      );

      if (scenes.length > 0) {
        await prisma.micro_scenes.createMany({
          data: scenes.map((scene, i) => ({
            episodeid: ep.episodeid,
            title: scene.title || `微剧场 ${Math.round(scene.startTime)}s`,
            summaryZh: scene.summaryZh,
            situationTag: meta.topicTags[0] || null,
            cefrLevel: meta.cefrLevel,
            coverUrl: meta.coverUrl,
            startTime: scene.startTime,
            endTime: scene.endTime,
            duration: scene.duration,
            clipsJson: {
              clips: scene.clips
                .map((c) => ({
                  clipid: idBySubtitle.get(c.subtitleId) || null,
                  subtitleId: c.subtitleId,
                  start: c.start,
                  end: c.end,
                  textEn: c.textEn,
                  textCn: c.textCn,
                  speaker: c.speaker,
                  words: c.words,
                }))
                .filter((c) => c.clipid),
            } as object,
            deepDiveJson: (deepDiveMapped[i] ?? undefined) as
              | object
              | undefined,
          })),
        });
      }
      if (created.count !== drafts.length) {
        console.warn(
          `  ⚠ ${ep.title}: 落库 ${created.count}/${drafts.length}`,
        );
      }
    }

    console.log(
      `[build-corpus-index] 完成：切片 ${totalClips} / 微剧场 ${totalScenes} / 跳过 ${skipped} 集`,
    );
    console.log(
      "[build-corpus-index] 提示：物理音频切片为懒生成（首次请求 /api/clips/{id}/audio 时 FFmpeg 截取并缓存 OSS）。",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[build-corpus-index] 失败：", err);
  process.exit(1);
});
