/**
 * 字幕迁移辅助脚本（旧版分离 SRT → 双语词级 JSON）— 供收录工作区
 * scripts/subtitle_migration.py 通过 `npx tsx` 调用。
 * 通道参照 scripts/upload-json-subtitles.ts（Prisma 直连 + lib/oss 直传/直删），
 * 站点 HTTP 接口没有字幕字段更新能力，故改库一律走本脚本。
 *
 * 用法（cwd 必须是 yuanlu 仓库根目录）：
 *   npx tsx scripts/subtitle-migrate.ts stats
 *   npx tsx scripts/subtitle-migrate.ts list --limit 20 [--podcast "频道标题"]
 *   npx tsx scripts/subtitle-migrate.ts fetch-audio --episodeid <id> --out <本地路径>
 *   npx tsx scripts/subtitle-migrate.ts finalize --episodeid <id> --url <OSS URL> --filename <OSS key>
 *
 * 约定：每个子命令在 stdout 打印一行 "@@RESULT@@" + JSON 作为机器可读结果，
 * 过程日志一律走 stderr，避免污染解析。
 */
import * as fs from "node:fs";
import * as path from "node:path";

// lib/oss.ts 在模块加载时读取 env，必须先加载 .env 再动态 import（与 upload-file.ts 同法）
for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

type EpisodeLike = {
  episodeid: string;
  title: string;
  status: string | null;
  podcastid: string | null;
  publishAt: Date;
  duration: number;
  audioUrl: string;
  audioFileName: string | null;
  subtitleEnUrl: string | null;
  subtitleZhUrl: string | null;
  subtitleEnFileName: string | null;
  subtitleZhFileName: string | null;
  subtitleBilingualUrl: string | null;
  subtitleBilingualFileName: string | null;
};

const SUBTITLE_SELECT = {
  episodeid: true,
  title: true,
  status: true,
  podcastid: true,
  publishAt: true,
  duration: true,
  audioUrl: true,
  audioFileName: true,
  subtitleEnUrl: true,
  subtitleZhUrl: true,
  subtitleEnFileName: true,
  subtitleZhFileName: true,
  subtitleBilingualUrl: true,
  subtitleBilingualFileName: true,
} as const;

function emit(result: unknown) {
  console.log("@@RESULT@@" + JSON.stringify(result));
}

function log(msg: string) {
  process.stderr.write(`[subtitle-migrate] ${msg}\n`);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function argInt(name: string, dflt: number): number {
  const v = arg(name);
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : dflt;
}

const isJsonEp = (e: EpisodeLike) => {
  const f = e.subtitleBilingualFileName || e.subtitleBilingualUrl || "";
  return !!e.subtitleBilingualUrl && /\.json(\?|$)/i.test(f);
};
const hasSrtEp = (e: EpisodeLike) => !!(e.subtitleEnUrl || e.subtitleZhUrl);
/** 迁移目标 where：无 JSON 且仍有任一 SRT 字段 */
const srtWhere = {
  subtitleBilingualUrl: null,
  OR: [{ subtitleEnUrl: { not: null } }, { subtitleZhUrl: { not: null } }],
} as const;

async function main() {
  const cmd = process.argv[2];
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    if (cmd === "stats") {
      const [episodes, podcasts] = await Promise.all([
        prisma.episode.findMany({ select: SUBTITLE_SELECT }),
        prisma.podcast.findMany({ select: { podcastid: true, title: true } }),
      ]);
      const podTitle = new Map(podcasts.map((p) => [p.podcastid, p.title]));

      let json = 0,
        srt = 0,
        missing = 0,
        mixed = 0,
        srtPublished = 0;
      const byPod = new Map<string, { title: string; count: number }>();
      for (const e of episodes as EpisodeLike[]) {
        if (isJsonEp(e)) {
          json++;
          if (hasSrtEp(e)) mixed++;
        } else if (hasSrtEp(e)) {
          srt++;
          if (e.status === "published") srtPublished++;
          const t =
            podTitle.get(e.podcastid || "") || e.podcastid || "(无频道)";
          const rec = byPod.get(t) || { title: t, count: 0 };
          rec.count++;
          byPod.set(t, rec);
        } else {
          missing++;
        }
      }
      emit({
        total: episodes.length,
        json,
        srt,
        srt_published: srtPublished,
        srt_unpublished: srt - srtPublished,
        missing,
        mixed_json_and_srt: mixed,
        srt_by_podcast: [...byPod.values()].sort((a, b) => b.count - a.count),
      });
    } else if (cmd === "list") {
      const limit = argInt("limit", 10);
      const podcastTitle = arg("podcast");
      const where: Record<string, unknown> = { ...srtWhere };
      if (podcastTitle) {
        const pod = await prisma.podcast.findFirst({
          where: { title: podcastTitle },
          select: { podcastid: true },
        });
        if (!pod) throw new Error(`未找到频道「${podcastTitle}」`);
        where.podcastid = pod.podcastid;
      }
      const [remaining, eps] = await Promise.all([
        prisma.episode.count({ where }),
        prisma.episode.findMany({
          where,
          orderBy: { publishAt: arg("order") === "asc" ? "asc" : "desc" },
          take: limit,
          select: SUBTITLE_SELECT,
        }),
      ]);
      const podcasts = await prisma.podcast.findMany({
        select: { podcastid: true, title: true },
      });
      const podTitle = new Map(podcasts.map((p) => [p.podcastid, p.title]));
      emit({
        remaining,
        episodes: (eps as EpisodeLike[]).map((e) => ({
          episodeid: e.episodeid,
          title: e.title,
          podcastTitle:
            podTitle.get(e.podcastid || "") || e.podcastid || "(无频道)",
          publishAt: e.publishAt,
          duration: e.duration,
          status: e.status,
          audioUrl: e.audioUrl,
          audioFileName: e.audioFileName,
        })),
      });
    } else if (cmd === "fetch-audio") {
      const episodeid = arg("episodeid");
      const out = arg("out");
      if (!episodeid || !out)
        throw new Error("fetch-audio 需要 --episodeid 与 --out");
      const { generateSignatureUrl, extractOssKey } = await import("@/lib/oss");
      const ep = await prisma.episode.findUnique({
        where: { episodeid },
        select: { audioUrl: true, audioFileName: true },
      });
      if (!ep) throw new Error(`剧集不存在: ${episodeid}`);
      // bucket 为私有，音频下载必须走签名 URL；优先 audioFileName（OSS key），缺失时从 URL 反推
      const key =
        ep.audioFileName || extractOssKey(ep.audioUrl || "") || ep.audioUrl;
      if (!key) throw new Error(`剧集无音频: ${episodeid}`);
      const signed = await generateSignatureUrl(key, 3600);
      const res = await fetch(signed);
      if (!res.ok) throw new Error(`OSS 下载失败 HTTP ${res.status}: ${key}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
      fs.writeFileSync(out, buf);
      log(`audio ${episodeid} ${(buf.length / 1048576).toFixed(1)}MB → ${out}`);
      emit({ episodeid, key, path: path.resolve(out), bytes: buf.length });
    } else if (cmd === "finalize") {
      const episodeid = arg("episodeid");
      const url = arg("url");
      const fileName = arg("filename");
      if (!episodeid || !url || !fileName)
        throw new Error("finalize 需要 --episodeid --url --filename");
      const { deleteObject, extractOssKey } = await import("@/lib/oss");
      const ep = await prisma.episode.findUnique({
        where: { episodeid },
        select: {
          subtitleEnUrl: true,
          subtitleZhUrl: true,
          subtitleEnFileName: true,
          subtitleZhFileName: true,
          subtitleBilingualUrl: true,
        },
      });
      if (!ep) throw new Error(`剧集不存在: ${episodeid}`);
      if (ep.subtitleBilingualUrl) {
        // 已迁移过（上批成功或重复调用），幂等跳过
        emit({
          episodeid,
          skipped: true,
          subtitleBilingualUrl: ep.subtitleBilingualUrl,
        });
        return;
      }
      // 删除旧版 en/zh SRT 对象（删除失败仅告警，不阻断改库）
      const oldKeys = [
        ep.subtitleEnFileName || extractOssKey(ep.subtitleEnUrl || "") || "",
        ep.subtitleZhFileName || extractOssKey(ep.subtitleZhUrl || "") || "",
      ].filter(Boolean);
      for (const k of oldKeys) {
        try {
          await deleteObject(k);
          log(`deleted old srt: ${k}`);
        } catch (e) {
          log(`删除旧 SRT 失败（忽略）: ${k} ${e}`);
        }
      }
      // 单次 update 原子收尾：写入 bilingual 字段并清空 en/zh 四字段
      await prisma.episode.update({
        where: { episodeid },
        data: {
          subtitleBilingualUrl: url,
          subtitleBilingualFileName: fileName,
          subtitleEnUrl: null,
          subtitleEnFileName: null,
          subtitleZhUrl: null,
          subtitleZhFileName: null,
        },
      });
      log(`finalized ${episodeid} → ${fileName}`);
      emit({
        episodeid,
        skipped: false,
        deletedOld: oldKeys,
        subtitleBilingualUrl: url,
      });
    } else {
      throw new Error(`未知子命令: ${cmd}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  process.stderr.write(`[subtitle-migrate] ERROR: ${e}\n`);
  process.exit(1);
});
