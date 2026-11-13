/**
 * [2026-11-13 M1 欠账补灌] corpus_clips 存量回填三件套：
 *   ① cutStart/cutEnd/padBeforeMs/padAfterMs/contentHash——v2 预计算切片窗口
 *      （含 next_raw_start−30ms overlap 裁剪防 bleed），与建库管线
 *      enrichDraftsWithCutWindows 同函数同口径（core/corpus/clip-core）；
 *   ② qcFlags——bleed/overlap_fix 数据级标记（原尾让闯入下句的行；边界盲听
 *      实证 47% 病灶的数据面落地；silence/loudness 属 M4 音频分析不在此列）；
 *   ③ modelId——T2.3 过夜批（pipelineVersion=corpus-annot-v1）补写
 *      qwen25-14b-awq（该轮 4090 vLLM 标注的模型标识，考卷可追溯性补全）。
 *
 * 回填后生效路径：computeSliceWindow 读序 cut 优先 → 切片窗口按裁剪值；
 * contentHash 有值 → 对象名 {id}-{hash8}.aac（M1「参数变更自动失效」指纹
 * 正式启用；已按裸名 {id}.aac 缓存的对象自动失权懒重切）。
 *
 * 用法：
 *   npx tsx scripts/corpus/backfill-cut-fingerprint.ts --dry   # 摸底不落库
 *   npx tsx scripts/corpus/backfill-cut-fingerprint.ts          # 全量回填
 *   npx tsx scripts/corpus/backfill-cut-fingerprint.ts --episode=<id>
 *   npx tsx scripts/corpus/backfill-cut-fingerprint.ts --skip-model-id  # 只回填窗口
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
  computeClipCutFields,
  type CutWindowFields,
} from "../../core/corpus/clip-core";
import * as crypto from "node:crypto";

const ANNOT_MODEL_ID = "qwen25-14b-awq"; // T2.3 过夜批实证模型（4090 vLLM）
const BATCH = 500;

interface Args {
  dry: boolean;
  episode: string | null;
  skipModelId: boolean;
}
function parseArgs(): Args {
  const a: Args = { dry: false, episode: null, skipModelId: false };
  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry") a.dry = true;
    else if (arg.startsWith("--episode=")) a.episode = arg.slice(10);
    else if (arg === "--skip-model-id") a.skipModelId = true;
  }
  return a;
}

const sha256hex = (s: string) =>
  crypto.createHash("sha256").update(s).digest("hex");

const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);

async function main() {
  const args = parseArgs();
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    // ── ③ modelId 补写（一条 UPDATE，幂等） ──
    if (!args.skipModelId) {
      if (args.dry) {
        const n = await prisma.corpus_clips.count({
          where: { pipelineVersion: "corpus-annot-v1", modelId: null },
        });
        console.log(`[dry] modelId 将补写 ${n} 行 → ${ANNOT_MODEL_ID}`);
      } else {
        const r = await prisma.$executeRawUnsafe(
          `UPDATE corpus_clips SET "modelId" = '${ANNOT_MODEL_ID}'
           WHERE "pipelineVersion" = 'corpus-annot-v1' AND "modelId" IS NULL`,
        );
        console.log(`modelId 补写完成：${r} 行 → ${ANNOT_MODEL_ID}`);
      }
    }

    // ── ①② cut/pad/hash/qcFlags 按集回填 ──
    const grouped = await prisma.corpus_clips.groupBy({
      by: ["episodeid"],
      ...(args.episode ? { where: { episodeid: args.episode } } : {}),
      _count: { _all: true },
    });
    const epIds = grouped.map((g) => g.episodeid);
    console.log(
      `[cut-fingerprint] 剧集 ${epIds.length} 集（共 ${grouped.reduce((s, g) => s + g._count._all, 0)} 行）${args.dry ? "（dry 摸底）" : ""}`,
    );

    let filled = 0;
    let skipped = 0;
    let bleedRows = 0;
    let episodes = 0;
    const t0 = Date.now();

    for (const epId of epIds) {
      const rows = await prisma.corpus_clips.findMany({
        where: { episodeid: epId },
        select: {
          clipid: true,
          enText: true,
          startTime: true,
          endTime: true,
          cutStart: true,
        },
        orderBy: { startTime: "asc" },
      });
      const pending: Array<{ id: string; f: CutWindowFields }> = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (r.cutStart != null) {
          continue; // 已回填（幂等重入）
        }
        const next = rows[i + 1];
        const f = computeClipCutFields(
          {
            enText: r.enText,
            startTime: num(r.startTime) ?? NaN,
            endTime: num(r.endTime) ?? NaN,
          },
          next ? num(next.startTime) : null,
          { sha256hex },
        );
        if (!f) {
          skipped += 1;
          continue;
        }
        if (f.flags.length) bleedRows += 1;
        pending.push({ id: r.clipid, f });
      }
      episodes += 1;
      filled += pending.length;
      if (args.dry || !pending.length) continue;

      // 批量 UPDATE ... FROM (VALUES)——flags 为受控枚举字面量（bleed/overlap_fix），
      // 无外部输入拼入 SQL；hash 为 hex、数值为 toFixed 产物
      for (let b = 0; b < pending.length; b += BATCH) {
        const chunk = pending.slice(b, b + BATCH);
        const values = chunk
          .map(({ id, f }) => {
            const arr =
              f.flags.length > 0
                ? `ARRAY[${f.flags.map((x) => `'${x}'`).join(",")}]::text[]`
                : `ARRAY[]::text[]`;
            return `('${id}',${f.cutStart.toFixed(3)},${f.cutEnd.toFixed(3)},${f.padBeforeMs},${f.padAfterMs},'${f.contentHash}',${arr})`;
          })
          .join(",");
        await prisma.$executeRawUnsafe(
          `UPDATE corpus_clips AS c SET
             "cutStart" = v.cs, "cutEnd" = v.ce,
             "padBeforeMs" = v.pb, "padAfterMs" = v.pa,
             "contentHash" = v.h, "qcFlags" = v.qf
           FROM (VALUES ${values}) AS v(id, cs, ce, pb, pa, h, qf)
           WHERE c.clipid = v.id`,
        );
      }
      if (episodes % 200 === 0) {
        console.log(
          `  … ${episodes}/${epIds.length} 集 | 已回填 ${filled} 行 | bleed ${bleedRows} | 跳过 ${skipped} | ${((Date.now() - t0) / 1000).toFixed(0)}s`,
        );
      }
    }

    console.log(
      `\n[cut-fingerprint] 完成：${episodes} 集 | 回填 ${filled} 行（bleed/overlap_fix ${bleedRows} 行，${filled ? ((bleedRows / filled) * 100).toFixed(1) : 0}%）| 非法跳过 ${skipped} 行${args.dry ? "（dry 未落库）" : ""}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[backfill-cut-fingerprint] 失败：", err);
  process.exit(1);
});
