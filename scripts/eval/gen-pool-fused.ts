// scripts/eval/gen-pool-fused.ts — T2.1①/M3 向量路融合复测（同池协议）
//
// 复用 baseline-recall.json 已归档的扩词（免二次 DeepSeek），重放召回 + 走
// fuseRankClips（VECTOR_SEARCH_ON=1 向量车道开）。产出：
//   .local/eval/queries-gold-fused-increment.csv — 融合池新增候选（TREC 并池协议，
//     仅旧池没有的 clipid → 待人工补标后金标准扩容，Recall 才公平可比）
//   .local/eval/fused-recall.json — 融合路 top-10 归档 + 对旧金标准的预备 Recall@10
//     （下界口径：融合召回的池外相关项尚未入金标准，补标后终算）
// 跑法：npx tsx scripts/eval/gen-pool-fused.ts（需灌数完成）
import * as fs from "node:fs";
import * as path from "node:path";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
process.env.VECTOR_SEARCH_ON = "1"; // 向量车道开（本脚本目的即测它）

const EVAL_DIR = path.join(process.cwd(), ".local", "eval");
const POOL_LIMIT = 30;

// 与 gen-pool 同款助手（保持两路召回口径一致）
const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "to",
  "for",
  "of",
  "in",
  "on",
  "at",
  "by",
  "with",
  "about",
  "as",
  "into",
  "through",
  "during",
  "before",
  "after",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "can",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "must",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "this",
  "that",
  "these",
  "those",
  "my",
  "your",
  "his",
  "her",
  "its",
  "our",
  "their",
  "me",
  "him",
  "us",
  "them",
  "what",
  "which",
  "who",
  "whom",
  "how",
  "when",
  "where",
  "why",
  "not",
  "no",
  "yes",
  "and",
  "or",
  "but",
  "if",
  "because",
  "so",
  "than",
  "too",
  "very",
  "just",
  "also",
  "am",
  "bit",
  "sure",
  "let",
  "lets",
  "going",
  "gonna",
  "us",
]);
const WEAK_WORDS = new Set([
  "time",
  "call",
  "check",
  "day",
  "way",
  "thing",
  "things",
  "people",
  "good",
  "great",
  "help",
  "next",
  "small",
  "large",
  "every",
  "today",
  "word",
  "words",
  "sentence",
  "sentences",
  "english",
  "listening",
  "speak",
  "talk",
  "quiz",
  "name",
  "part",
  "place",
  "first",
  "right",
]);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const phraseContentWords = (p: string) =>
  p
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !WEAK_WORDS.has(w));
const zhGrams = (q: string) => {
  if (!/^[\u4e00-\u9fa5\s]+$/.test(q)) return [];
  const g: string[] = [];
  for (let i = 0; i < q.length - 1; i++)
    if (!g.includes(q.slice(i, i + 2))) g.push(q.slice(i, i + 2));
  return g.slice(0, 6);
};

const CLIP_SELECT = {
  clipid: true,
  episodeid: true,
  subtitleId: true,
  startTime: true,
  endTime: true,
  duration: true,
  enText: true,
  zhText: true,
  wordsJson: true,
  wpm: true,
  cefrLevel: true,
  coverUrl: true,
  sourceLabel: true,
  topicTags: true,
};
type ClipRow = {
  clipid: string;
  episodeid: string;
  subtitleId: number;
  startTime: number;
  endTime: number;
  duration: number;
  enText: string;
  zhText: string | null;
  wpm: number;
  cefrLevel: string | null;
  duration2?: never;
};

function readCsvPool(): Map<number, Set<string>> {
  const text = fs
    .readFileSync(path.join(EVAL_DIR, "queries-gold.csv"), "utf8")
    .replace(/^\uFEFF/, "");
  const rows = text.split("\n").filter(Boolean);
  // 只需 query_id + clipid 两列（首列与第 5 列）
  const pool = new Map<number, Set<string>>();
  for (const line of rows.slice(1)) {
    const cols: string[] = [];
    let f = "",
      inQ = false;
    for (const ch of line) {
      if (inQ) {
        if (ch === '"') inQ = false;
        else f += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ",") {
        cols.push(f);
        f = "";
      } else f += ch;
    }
    cols.push(f);
    const qid = Number(cols[0]);
    if (!pool.has(qid)) pool.set(qid, new Set());
    pool.get(qid)!.add(cols[4]);
  }
  return pool;
}

function readGold(): Map<number, Set<string>> {
  // 从 gold-baseline.json 读金标准（标注后的相关集）
  const g = JSON.parse(
    fs.readFileSync(path.join(EVAL_DIR, "gold-baseline.json"), "utf8"),
  );
  const out = new Map<number, Set<string>>();
  for (const [qid, ids] of Object.entries(g.gold as Record<string, string[]>)) {
    out.set(Number(qid), new Set(ids));
  }
  return out;
}

async function main() {
  const { PrismaClient, Prisma } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const { isJunkClip } = await import("../../core/studio/curator.core");
  const { hasSensitiveTerm } = await import("../../core/corpus/clip-core");
  const { fuseRankClips } = await import(
    "../../core/corpus/vector-fusion.core"
  );
  const { clipEmbeddingRepo } = await import(
    "../../core/corpus/clip-embedding.repo"
  );

  const cov = await clipEmbeddingRepo.coverage();
  console.log(
    `水位：clips=${cov.clips}（<100000 时融合结果不完整，建议灌满再跑）`,
  );

  const baseline = JSON.parse(
    fs.readFileSync(path.join(EVAL_DIR, "baseline-recall.json"), "utf8"),
  );
  const oldPool = readCsvPool();
  const gold = readGold();

  const incrRows: string[] = [
    "query_id,query,category,rank,clipid,difficulty,wpm,enText,zhText,标注(相关/不相关/不确定),备注",
  ];
  const csvEsc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const fused: unknown[] = [];
  let newCandidates = 0;

  for (const b of baseline.queries as Array<{
    qid: number;
    q: string;
    category: string;
    phrases: string[];
    zhWords: string[];
  }>) {
    const { q, phrases, zhWords } = b;
    const keywords: string[] = [];
    phrases.map(phraseContentWords).forEach((ws) =>
      ws.forEach((w) => {
        if (!keywords.includes(w)) keywords.push(w);
      }),
    );
    const grams = zhGrams(q);
    const wb = (hay: string, n: string) =>
      new RegExp(`\\b${esc(n)}\\b`, "i").test(hay);

    const rows = await prisma.corpus_clips.findMany({
      where: {
        wordsJson: { not: Prisma.DbNull },
        zhText: { not: null },
        OR: [
          ...phrases.map((p) => ({
            enText: { contains: p, mode: "insensitive" as const },
          })),
          ...keywords.map((k) => ({
            enText: { contains: k, mode: "insensitive" as const },
          })),
          { zhText: { contains: q } },
          ...zhWords.map((w) => ({ zhText: { contains: w } })),
          ...grams.map((g) => ({ zhText: { contains: g } })),
        ],
      },
      select: CLIP_SELECT,
      orderBy: { wpm: "asc" },
      take: 300,
    });
    const usable = rows.filter(
      (r) =>
        !isJunkClip({ enText: r.enText, duration: r.duration, wpm: r.wpm }) &&
        !hasSensitiveTerm(r.enText) &&
        !hasSensitiveTerm(r.zhText) &&
        (phrases.some((p) => wb(r.enText, p)) ||
          keywords.some((k) => wb(r.enText, k)) ||
          !!(r.zhText && r.zhText.includes(q)) ||
          zhWords.some((w) => r.zhText!.includes(w)) ||
          grams.some((g) => r.zhText!.includes(g))),
    );
    const picked = await fuseRankClips({
      query: q,
      usable: usable as ClipRow[],
      rankCtx: {
        phrases,
        perPhraseWords: phrases.map(phraseContentWords),
        query: q,
        grams: [...zhWords, ...grams],
      },
      limit: POOL_LIMIT,
      fetchByClipIds: async (ids) =>
        (await prisma.corpus_clips.findMany({
          where: { clipid: { in: ids } },
          select: CLIP_SELECT,
        })) as ClipRow[],
      isEligible: (r: ClipRow) =>
        !isJunkClip({ enText: r.enText, duration: r.duration, wpm: r.wpm }) &&
        !hasSensitiveTerm(r.enText) &&
        !hasSensitiveTerm(r.zhText),
    });

    // 增量候选：融合池有、旧池没有 → 待补标
    const op = oldPool.get(b.qid) || new Set<string>();
    let rank = 0;
    for (const r of picked) {
      if (!op.has(r.clipid)) {
        rank++;
        newCandidates++;
        incrRows.push(
          [
            b.qid,
            csvEsc(q),
            csvEsc(b.category),
            rank,
            r.clipid,
            (r as ClipRow & { cefrLevel: string | null }).cefrLevel || "",
            r.wpm || "",
            csvEsc(r.enText),
            csvEsc(r.zhText),
            "",
            csvEsc("#fused新增"),
          ].join(","),
        );
      }
    }
    const g = gold.get(b.qid) || new Set<string>();
    const hits = picked.slice(0, 10).filter((r) => g.has(r.clipid)).length;
    fused.push({
      qid: b.qid,
      q,
      category: b.category,
      goldSize: g.size,
      top10: picked.slice(0, 10).map((r) => r.clipid),
      prelimRecall10: g.size > 0 ? hits / g.size : null,
    });
    console.log(
      `#${b.qid} ${q} → 融合池 ${picked.length}（新增 ${picked.length - [...op].filter((id) => picked.some((p) => p.clipid === id)).length}）`,
    );
  }

  fs.writeFileSync(
    path.join(EVAL_DIR, "queries-gold-fused-increment.csv"),
    "\uFEFF" + incrRows.join("\n"),
    "utf8",
  );
  fs.writeFileSync(
    path.join(EVAL_DIR, "fused-recall.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        lane: "fused v1（证据分 + SiliconFlow BGE-M3 向量车道 W=25 min_sim=0.3）",
        preliminary: "对旧金标准的下界口径——增量候选补标后扩容金标准再终算",
        queries: fused,
      },
      null,
      2,
    ),
    "utf8",
  );
  const measurable = (fused as Array<{ prelimRecall10: number | null }>).filter(
    (f) => f.prelimRecall10 !== null,
  );
  const mean = measurable.length
    ? measurable.reduce((s, f) => s + (f.prelimRecall10 as number), 0) /
      measurable.length
    : 0;
  console.log(
    `\n增量候选 ${newCandidates} 行待补标 → queries-gold-fused-increment.csv`,
  );
  console.log(
    `预备 Recall@10（旧金标准下界）：${(mean * 100).toFixed(1)}%（可测 ${measurable.length}/50；基线 60.8%）`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
