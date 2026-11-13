// scripts/corpus/upsert-annotations.ts — [M2/T2.3 stage06 前置] 标注 jsonl 落库（additive 列）
//
// 读 .local/annotate/<run>/{clips.jsonl, scenes.jsonl}：
//   clips → corpus_clips.worthyScore/pipelineVersion（按 clipid；scenarioTag 无独立列，留在 jsonl 供场景多数票/后续 facet）
//   scenes → micro_scenes.title/summaryZh/situationTag（按 sceneKey 稳定键；sceneid/clipAudioKey 不动）
// 幂等：可重复跑（值覆盖写）；--dry 只统计不写。
// 跑法：npx tsx scripts/corpus/upsert-annotations.ts --run=run1 [--dry]
import * as fs from "node:fs";
import * as path from "node:path";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

import { SCENARIO_KEY_SET } from "../../core/corpus/scenario-taxonomy";

async function main() {
  const run = (
    process.argv.find((a) => a.startsWith("--run=")) || "--run=run1"
  ).slice(6);
  const dry = process.argv.includes("--dry");
  const runDir = path.join(process.cwd(), ".local", "annotate", run);
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  // clips
  const clipsPath = path.join(runDir, "clips.jsonl");
  let clipUpdated = 0;
  if (fs.existsSync(clipsPath)) {
    const lines = fs
      .readFileSync(clipsPath, "utf8")
      .split("\n")
      .filter(Boolean);
    // 去重：滑窗重叠（stride5/window6）致同一 clipid 多行——保留末次判定
    const byId = new Map<
      string,
      {
        clipid: string;
        worthyScore: number;
        pipelineVersion: string;
        modelId?: string;
      }
    >();
    for (const l of lines) {
      try {
        const x = JSON.parse(l) as {
          clipid: string;
          worthyScore: number;
          pipelineVersion: string;
          modelId?: string;
        };
        if (typeof x.worthyScore === "number") byId.set(x.clipid, x);
      } catch {
        /* 脏行忽略 */
      }
    }
    const rows = [...byId.values()];
    console.log(
      `clips.jsonl：${lines.length} 行 → 去重后 ${rows.length} 唯一${dry ? "（dry 不写）" : ""}`,
    );
    if (!dry) {
      // [2026-11-13] modelId 补写（考卷可追溯性）：jsonl 行内 modelId 优先，
      // 缺省回退 env VLLM_MODEL（annotate-clips 跑批同源）；两者皆空则不写该列
      const envModel = (process.env.VLLM_MODEL || "").trim();
      const modelOf = (x: { modelId?: unknown }) =>
        typeof x.modelId === "string" && x.modelId.trim()
          ? x.modelId.trim()
          : envModel || null;
      const withModel = rows.some((r) => modelOf(r));
      for (let i = 0; i < rows.length; i += 200) {
        // 逐批 UPDATE ... FROM VALUES（raw，幂等覆盖）
        const { Prisma } = await import("@prisma/client");
        const batch = rows.slice(i, i + 200);
        if (withModel) {
          const values = batch.map(
            (r) =>
              Prisma.sql`(${r.clipid}, ${r.worthyScore}::double precision, ${r.pipelineVersion}, ${modelOf(r)})`,
          );
          await prisma.$executeRaw`
            UPDATE corpus_clips AS c
            SET "worthyScore" = v.w, "pipelineVersion" = v.pv, "modelId" = v.m
            FROM (VALUES ${Prisma.join(values)}) AS v(cid, w, pv, m)
            WHERE c.clipid = v.cid`;
        } else {
          const values = batch.map(
            (r) =>
              Prisma.sql`(${r.clipid}, ${r.worthyScore}::double precision, ${r.pipelineVersion})`,
          );
          await prisma.$executeRaw`
            UPDATE corpus_clips AS c
            SET "worthyScore" = v.w, "pipelineVersion" = v.pv
            FROM (VALUES ${Prisma.join(values)}) AS v(cid, w, pv)
            WHERE c.clipid = v.cid`;
        }
        clipUpdated += batch.length;
      }
    }
  } else console.log("clips.jsonl 不存在，跳过");

  // scenes（批量 UPDATE ... FROM VALUES——22k 逐条 update 要 10min+，批量化）
  const scenesPath = path.join(runDir, "scenes.jsonl");
  let sceneUpdated = 0;
  if (fs.existsSync(scenesPath)) {
    const lines = fs
      .readFileSync(scenesPath, "utf8")
      .split("\n")
      .filter(Boolean);
    const byKey = new Map<
      string,
      {
        sceneKey: string;
        title: string;
        summaryZh: string;
        scenarioTag: string;
      }
    >();
    for (const l of lines) {
      try {
        const x = JSON.parse(l) as {
          sceneKey: string;
          title: string;
          summaryZh: string;
          scenarioTag: string;
        };
        if (
          x.sceneKey &&
          x.title &&
          x.summaryZh &&
          SCENARIO_KEY_SET.has(x.scenarioTag)
        )
          byKey.set(x.sceneKey, x);
      } catch {
        /* 脏行忽略 */
      }
    }
    const rows = [...byKey.values()];
    console.log(
      `scenes.jsonl：${lines.length} 行 → 去重+枚举校验后 ${rows.length}${dry ? "（dry 不写）" : ""}`,
    );
    if (!dry) {
      const { Prisma } = await import("@prisma/client");
      for (let i = 0; i < rows.length; i += 200) {
        const batch = rows.slice(i, i + 200);
        const values = batch.map(
          (r) =>
            Prisma.sql`(${r.sceneKey}, ${r.title}, ${r.summaryZh}, ${r.scenarioTag})`,
        );
        const res = await prisma.$executeRaw`
          UPDATE micro_scenes AS s
          SET title = v.t, "summaryZh" = v.sz, "situationTag" = v.st
          FROM (VALUES ${Prisma.join(values)}) AS v(sk, t, sz, st)
          WHERE s."sceneKey" = v.sk`;
        sceneUpdated += res;
      }
    }
  } else console.log("scenes.jsonl 不存在，跳过");

  console.log(`落库：clips ${clipUpdated} / scenes ${sceneUpdated}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
