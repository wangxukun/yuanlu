// scripts/corpus/embed-corpus.ts — [M2/T2.4] 离线向量灌数（SiliconFlow BGE-M3）
//
// 查询侧选型已拍板 SiliconFlow 托管 BGE-M3（T3.5，2026-11-08）——离线灌数同源同模型，
// 零漂移。本脚本灌 corpus_clips.embedding（en_text 路）；micro_scenes.embeddingZh
// （zh 场景路）待 M2-T2.3 场景身份重建产出 scenario_desc 后另跑（embed-scenes）。
//
// 特性：
//   - 只选 embedding IS NULL 的行 → 天然断点续跑（中断重跑自动跳过已灌）
//   - 32 文本/请求 × 并发 6，110k 行约 3,500 次调用，~5 分钟
//   - 429 限流指数退避；维度断言 1024；upsert 走 clip-embedding.repo
// 跑法：
//   npx tsx scripts/corpus/embed-corpus.ts --limit=200   # 冒烟（200 行）
//   npx tsx scripts/corpus/embed-corpus.ts               # 全量（断点续跑）
import * as fs from "node:fs";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const API_BASE =
  process.env.SILICONFLOW_BASE || "https://api.siliconflow.cn/v1";
const MODEL = process.env.SILICONFLOW_EMBED_MODEL || "BAAI/bge-m3";
const BATCH = 32; // SiliconFlow embeddings 单请求文本上限
const BATCHES_PER_PAGE = 6; // 每页并发 6 请求（同时即并发上限）
const UPSERT_CHUNK = 100; // 单条 SQL VALUES 行数（1024 维字面量 ~9KB/行）

function parseLimit(): number {
  const a = process.argv.find((x) => x.startsWith("--limit="));
  return a ? Number(a.slice(8)) || 0 : 0;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const key = process.env.SILICONFLOW_API_KEY;
  if (!key) throw new Error("缺 SILICONFLOW_API_KEY（.env 配置后重跑）");
  for (let attempt = 1; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(`${API_BASE}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        signal: controller.signal,
        body: JSON.stringify({ model: MODEL, input: texts }),
      });
      if (res.status === 429 || res.status >= 500) {
        if (attempt >= 6)
          throw new Error(`embeddings ${res.status} ×${attempt}`);
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        continue;
      }
      if (!res.ok)
        throw new Error(
          `embeddings ${res.status}: ${(await res.text()).slice(0, 200)}`,
        );
      const json = (await res.json()) as {
        data: Array<{ embedding: number[]; index: number }>;
      };
      // 按 index 归位（保证与输入顺序一致）
      const out: number[][] = new Array(texts.length);
      for (const d of json.data || []) {
        if (!Array.isArray(d.embedding) || d.embedding.length !== 1024) {
          throw new Error(`维度异常 ${d.embedding?.length}（预期 1024）`);
        }
        out[d.index] = d.embedding;
      }
      if (out.some((v) => !v)) throw new Error("返回缺项");
      return out;
    } finally {
      clearTimeout(timer);
    }
  }
}

async function main() {
  const { PrismaClient, Prisma } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const { clipEmbeddingRepo } = await import(
    "../../core/corpus/clip-embedding.repo"
  );
  const limit = parseLimit();

  const totalNullRows = await prisma.$queryRaw<Array<{ n: bigint }>>(
    Prisma.sql`SELECT COUNT(*)::bigint AS n FROM corpus_clips WHERE embedding IS NULL`,
  );
  const totalNull = Number(totalNullRows[0]?.n ?? 0);
  console.log(
    `[embed-corpus] 待灌 ${totalNull} 行${limit ? `（本次限 ${limit}）` : ""} ｜ ${MODEL} @ ${API_BASE}`,
  );

  // 游标分页取未灌行（只取必要列；embedding 为 Unsupported 不能进 select → raw SQL）
  let cursor = "";
  let done = 0;
  const t0 = Date.now();
  while (true) {
    const pageSize = Math.min(
      BATCH * BATCHES_PER_PAGE,
      limit
        ? Math.min(limit - done, BATCH * BATCHES_PER_PAGE)
        : BATCH * BATCHES_PER_PAGE,
    );
    if (pageSize <= 0) break;
    const gt = cursor ? Prisma.sql`AND clipid > ${cursor}` : Prisma.empty;
    const rows = await prisma.$queryRaw<
      Array<{ clipid: string; enText: string }>
    >`SELECT "clipid", "enText" FROM corpus_clips
      WHERE embedding IS NULL ${gt}
      ORDER BY clipid LIMIT ${pageSize}`;
    if (!rows.length) break;
    cursor = rows[rows.length - 1].clipid;

    // 分批并发嵌入（每页 ≤ BATCHES_PER_PAGE 个请求并发）
    const batches: Array<Array<{ clipid: string; text: string }>> = [];
    for (let i = 0; i < rows.length; i += BATCH) {
      batches.push(
        rows
          .slice(i, i + BATCH)
          .map((r) => ({ clipid: r.clipid, text: r.enText })),
      );
    }
    const settled = await Promise.all(
      batches.map(async (b) => {
        const vecs = await embedBatch(b.map((x) => x.text));
        return b.map((x, i) => ({ clipid: x.clipid, embedding: vecs[i] }));
      }),
    );
    const flat: Array<{ clipid: string; embedding: number[] }> = settled.flat();

    // 分块 upsert
    for (let i = 0; i < flat.length; i += UPSERT_CHUNK) {
      await clipEmbeddingRepo.upsertClipEmbeddings(
        flat.slice(i, i + UPSERT_CHUNK),
      );
    }
    done += flat.length;
    if (done % 2000 < BATCH * BATCHES_PER_PAGE) {
      const rate = done / ((Date.now() - t0) / 1000);
      console.log(`  已灌 ${done}（${rate.toFixed(0)} 行/s）`);
    }
    if (limit && done >= limit) break;
  }

  const cov = await clipEmbeddingRepo.coverage();
  console.log(
    `[embed-corpus] 完成：本批 ${done} ｜ 水位 clips=${cov.clips} / scenes=${cov.scenes}`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
