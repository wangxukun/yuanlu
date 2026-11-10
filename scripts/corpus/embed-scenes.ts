// scripts/corpus/embed-scenes.ts — [M2/T2.4s] 场景 zh 路向量灌数（身份重建后）
//
// 前置：upsert-annotations 已落 title/summaryZh（语义密度 = 句译文 + 场景导读）。
// 向量文本 = "title。summaryZh 句1译 句2译 …"（截 800 字）；SiliconFlow BGE-M3
// 与 en 路同模型；断点续跑同 embed-corpus（embeddingZh IS NULL 才取）。
// 跑法：npx tsx scripts/corpus/embed-scenes.ts --limit=50（冒烟）/ 全量
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
const BATCH = 32;

async function embedBatch(texts: string[]): Promise<number[][]> {
  const key = process.env.SILICONFLOW_API_KEY;
  if (!key) throw new Error("缺 SILICONFLOW_API_KEY");
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
      if (!res.ok) throw new Error(`embeddings ${res.status}`);
      const json = (await res.json()) as {
        data: Array<{ embedding: number[]; index: number }>;
      };
      const out: number[][] = new Array(texts.length);
      for (const d of json.data || []) {
        if (!Array.isArray(d.embedding) || d.embedding.length !== 1024)
          throw new Error("维度异常");
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
  const lim = process.argv.find((a) => a.startsWith("--limit="));
  const limit = lim ? Number(lim.slice(8)) || 0 : 0;
  const { PrismaClient, Prisma } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const { clipEmbeddingRepo } = await import(
    "../../core/corpus/clip-embedding.repo"
  );

  const pending = await prisma.$queryRaw<Array<{ n: bigint }>>(
    Prisma.sql`SELECT COUNT(*)::bigint AS n FROM micro_scenes WHERE "embeddingZh" IS NULL`,
  );
  console.log(
    `[embed-scenes] 待灌 ${Number(pending[0].n)}${limit ? `（限 ${limit}）` : ""}`,
  );

  let cursor = "";
  let done = 0;
  while (true) {
    const gt = cursor ? Prisma.sql`AND sceneid > ${cursor}` : Prisma.empty;
    const rows = await prisma.$queryRaw<
      Array<{
        sceneid: string;
        title: string;
        summaryZh: string | null;
        clipsJson: unknown;
      }>
    >`SELECT sceneid, title, "summaryZh", "clipsJson" FROM micro_scenes
      WHERE "embeddingZh" IS NULL ${gt} ORDER BY sceneid LIMIT ${BATCH * 4}`;
    if (!rows.length) break;
    cursor = rows[rows.length - 1].sceneid;

    const texts = rows.map((r) => {
      const clips =
        (r.clipsJson as { clips?: Array<{ textCn?: string | null }> } | null)
          ?.clips || [];
      const sents = clips
        .map((c) => (c.textCn || "").trim())
        .filter(Boolean)
        .join(" ");
      return `${r.title}。${r.summaryZh || ""} ${sents}`.slice(0, 800);
    });
    const vecs = await embedBatch(texts);
    await clipEmbeddingRepo.upsertSceneEmbeddings(
      rows.map((r, i) => ({ sceneid: r.sceneid, embedding: vecs[i] })),
    );
    done += rows.length;
    if (done % 1000 < BATCH * 4) console.log(`  已灌 ${done}`);
    if (limit && done >= limit) break;
  }
  const cov = await clipEmbeddingRepo.coverage();
  console.log(
    `[embed-scenes] 完成：本批 ${done} ｜ 水位 clips=${cov.clips} / scenes=${cov.scenes}`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
