// scripts/eval/tune-fusion.ts — M3 调参矩阵：min_sim × W_VEC 扫描（扩容金标准口径）
//
// 复用已归档扩词（baseline-recall.json）+ 扩容金标准（gold-baseline ∪ 增量相关）；
// 每查询的 DB 召回池与向量近邻只取一次，9 配置纯内存重排。
// 产出：.local/eval/{tune-matrix.json, 调参矩阵报告.md}（含 R@5 参考口径——只报告不挪门）
// 跑法：npx tsx scripts/eval/tune-fusion.ts
import * as fs from "node:fs";
import * as path from "node:path";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
process.env.VECTOR_SEARCH_ON = "1";

const EVAL_DIR = path.join(process.cwd(), ".local", "eval");
const CONFIGS: Array<{ w: number; minSim: number }> = [];
for (const w of [15, 25, 35])
  for (const minSim of [0.3, 0.4, 0.45]) CONFIGS.push({ w, minSim });
// 门机制活性探针：高阈值档 + 1.1 不可能档（后者应退化为纯关键词路——若不变则实现有 bug）
CONFIGS.push(
  { w: 35, minSim: 0.55 },
  { w: 35, minSim: 0.65 },
  { w: 35, minSim: 1.1 },
);

// —— 与 gen-pool 同款助手（口径一致）——
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

function readCsv(f: string): string[][] {
  const text = fs
    .readFileSync(path.join(EVAL_DIR, f), "utf8")
    .replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const CLIP_SELECT = {
  clipid: true,
  episodeid: true,
  enText: true,
  zhText: true,
  wpm: true,
  duration: true,
  worthyScore: true, // [T3.3] 门禁复检用
};

async function main() {
  const { PrismaClient, Prisma } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const { isJunkClip, scoreSemanticClip } = await import(
    "../../core/studio/curator.core"
  );
  const { hasSensitiveTerm } = await import("../../core/corpus/clip-core");
  const { embedQuery } = await import("../../core/corpus/query-embed.core");
  const { clipEmbeddingRepo } = await import(
    "../../core/corpus/clip-embedding.repo"
  );

  // 扩容金标准（2026-11-09 换 relabel 正本——二次标注更严口径）
  const goldBase = JSON.parse(
    fs.readFileSync(path.join(EVAL_DIR, "gold-baseline.json"), "utf8"),
  );
  const expGold = new Map<number, Set<string>>();
  for (const [qid, ids] of Object.entries(
    goldBase.gold as Record<string, string[]>,
  )) {
    expGold.set(Number(qid), new Set(ids));
  }
  const inc = readCsv("queries-gold-fused-increment-relabel.csv");
  const iHead = inc[0];
  const iQid = iHead.indexOf("query_id"),
    iClip = iHead.indexOf("clipid"),
    iLabel = iHead.indexOf("标注(相关/不相关/不确定)");
  for (const r of inc.slice(1)) {
    if ((r[iLabel] || "").trim() === "相关") {
      const qid = Number(r[iQid]);
      if (!expGold.has(qid)) expGold.set(qid, new Set());
      expGold.get(qid)!.add(r[iClip]);
    }
  }

  // 一致性核查：原标 vs relabel（同 query_id+clipid 对齐）
  {
    const orig = readCsv("queries-gold-fused-increment.csv");
    const oHead = orig[0];
    const oQid = oHead.indexOf("query_id"),
      oClip = oHead.indexOf("clipid"),
      oLabel = oHead.indexOf("标注(相关/不相关/不确定)");
    const key = (q: string, c: string) => q + "|" + c;
    const origMap = new Map<string, string>();
    for (const r of orig.slice(1))
      origMap.set(key(r[oQid], r[oClip]), (r[oLabel] || "").trim());
    let agree = 0,
      disagree = 0;
    const drift: Record<string, number> = {};
    for (const r of inc.slice(1)) {
      const o = origMap.get(key(r[iQid], r[iClip]));
      const n = (r[iLabel] || "").trim();
      if (o === n) agree++;
      else {
        disagree++;
        const k = `${o || "空"}→${n || "空"}`;
        drift[k] = (drift[k] || 0) + 1;
      }
    }
    console.log(
      `[一致性] 原 vs relabel：一致 ${agree} / 不一致 ${disagree}（${((agree / (agree + disagree)) * 100).toFixed(1)}%）`,
    );
    console.log(`[漂移] ${JSON.stringify(drift)}`);
  }

  const baseline = JSON.parse(
    fs.readFileSync(path.join(EVAL_DIR, "baseline-recall.json"), "utf8"),
  );

  type QueryData = {
    qid: number;
    gold: Set<string>;
    usable: Array<{
      clipid: string;
      episodeid: string;
      enText: string;
      zhText: string | null;
      wpm: number;
      duration: number;
    }>;
    evidenceScore: Map<string, number>;
    vectorSim: Map<string, number>;
  };
  const queries: QueryData[] = [];

  for (const b of baseline.queries as Array<{
    qid: number;
    q: string;
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
        // [T3.3] AND 级合成：证据命中 AND worthy 门禁（null 未判不误杀）——与生产 match 路由同口径
        AND: [
          {
            OR: [
              ...phrases.map((p: string) => ({
                enText: { contains: p, mode: "insensitive" as const },
              })),
              ...keywords.map((k) => ({
                enText: { contains: k, mode: "insensitive" as const },
              })),
              { zhText: { contains: q } },
              ...zhWords.map((w: string) => ({ zhText: { contains: w } })),
              ...grams.map((g) => ({ zhText: { contains: g } })),
            ],
          },
          { OR: [{ worthyScore: { gte: 0.4 } }, { worthyScore: null }] },
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
        (phrases.some((p: string) => wb(r.enText, p)) ||
          keywords.some((k) => wb(r.enText, k)) ||
          !!(r.zhText && r.zhText.includes(q)) ||
          zhWords.some((w: string) => r.zhText!.includes(w)) ||
          grams.some((g) => r.zhText!.includes(g))),
    );
    // 每查询一次性向量近邻（含池外补召回候选）
    const qv = await embedQuery(q);
    const vectorSim = new Map<string, number>();
    if (qv) {
      const hits = await clipEmbeddingRepo.nearestClips(qv, 60);
      for (const h of hits) vectorSim.set(h.id, h.similarity);
      const usableIds = new Set(usable.map((r) => r.clipid));
      const missing = [...vectorSim.keys()]
        .filter((id) => !usableIds.has(id))
        .slice(0, 40);
      if (missing.length) {
        const extra = await prisma.corpus_clips.findMany({
          where: { clipid: { in: missing } },
          select: CLIP_SELECT,
        });
        for (const r of extra) {
          if (
            !isJunkClip({
              enText: r.enText,
              duration: r.duration,
              wpm: r.wpm,
            }) &&
            !hasSensitiveTerm(r.enText) &&
            !hasSensitiveTerm(r.zhText)
          ) {
            usable.push(r);
          }
        }
      }
    }
    const evidenceScore = new Map<string, number>();
    const rankCtx = {
      phrases,
      perPhraseWords: phrases.map(phraseContentWords),
      query: q,
      grams: [...zhWords, ...grams],
    };
    for (const r of usable)
      evidenceScore.set(r.clipid, scoreSemanticClip(r, rankCtx));
    queries.push({
      qid: b.qid,
      gold: expGold.get(b.qid) || new Set(),
      usable,
      evidenceScore,
      vectorSim,
    });
    console.log(`#${b.qid} 池 ${usable.length}（向量 ${vectorSim.size}）`);
  }

  // min_sim 不敏感甄别：向 sim 分布取证——各查询 top60 近邻的 min/中位/落在 [0.3,0.45) 带内的条数
  {
    let globalMin = 1,
      inBand = 0,
      total = 0;
    const perQueryMin: number[] = [];
    for (const qd of queries) {
      const sims = [...qd.vectorSim.values()];
      if (!sims.length) continue;
      const mn = Math.min(...sims);
      perQueryMin.push(mn);
      globalMin = Math.min(globalMin, mn);
      for (const s of sims) {
        total++;
        if (s >= 0.3 && s < 0.45) inBand++;
      }
    }
    perQueryMin.sort((a, b) => a - b);
    console.log(
      `\n[min_sim 甄别] 50 query × top60 近邻：全局最小 sim=${globalMin.toFixed(3)} ｜ 各查询最小 sim 中位=${perQueryMin[Math.floor(perQueryMin.length / 2)].toFixed(3)} ｜ 落在 [0.3,0.45) 带内 ${inBand}/${total} 条`,
    );
    console.log(
      `  → ${inBand === 0 ? "带内零条：min_sim 0.3-0.45 无差异是【数据特性】（近邻全部 ≥0.45），非实现问题" : `带内 ${inBand} 条：0.3/0.45 应有差异，若无则查 rankTopN 的 bonus 门`}`,
    );
  }

  // —— 融合重排（参数化内联版，与 vector-fusion.core 同口径）——
  function rankTopN(
    qd: QueryData,
    w: number,
    minSim: number,
    n: number,
  ): string[] {
    const scored = qd.usable
      .map((r) => ({
        id: r.clipid,
        ep: r.episodeid,
        s:
          (qd.evidenceScore.get(r.clipid) ?? -Infinity) +
          ((qd.vectorSim.get(r.clipid) ?? -Infinity) >= minSim
            ? (qd.vectorSim.get(r.clipid) as number) * w
            : 0),
      }))
      .filter((x) => Number.isFinite(x.s))
      .sort((a, b) => b.s - a.s);
    const perEp = new Map<string, number>();
    const picked: string[] = [];
    for (const x of scored) {
      const c = perEp.get(x.ep) || 0;
      if (c >= 2) continue;
      perEp.set(x.ep, c + 1);
      picked.push(x.id);
      if (picked.length >= n) break;
    }
    return picked;
  }

  const pct = (v: number) => (Math.round(v * 1000) / 10).toFixed(1) + "%";
  const matrix = CONFIGS.map(({ w, minSim }) => {
    const perQ = queries
      .map((qd) => {
        if (qd.gold.size === 0) return null;
        const top10 = rankTopN(qd, w, minSim, 10);
        const top5 = top10.slice(0, 5);
        return {
          r10: top10.filter((id) => qd.gold.has(id)).length / qd.gold.size,
          r5:
            top5.filter((id) => qd.gold.has(id)).length /
            Math.min(5, qd.gold.size),
        };
      })
      .filter((x): x is { r10: number; r5: number } => x !== null);
    const mean = (k: "r10" | "r5") =>
      perQ.reduce((s, x) => s + x[k], 0) / perQ.length;
    return {
      w,
      minSim,
      measurable: perQ.length,
      r10: Math.round(mean("r10") * 1000) / 1000,
      r5: Math.round(mean("r5") * 1000) / 1000,
    };
  });
  const best = matrix.reduce((a, b) => (b.r10 > a.r10 ? b : a));
  fs.writeFileSync(
    path.join(EVAL_DIR, "tune-matrix.json"),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), matrix, best },
      null,
      2,
    ),
    "utf8",
  );
  const md = [
    "# 调参矩阵（扩容金标准 · 可测 46/50 · T2.3 前天花板探测）",
    "",
    "| W_VEC | min_sim | R@10 | R@5(参考) |",
    "|---|---|---|---|",
    ...matrix.map(
      (m) => `| ${m.w} | ${m.minSim} | ${pct(m.r10)} | ${pct(m.r5)} |`,
    ),
    "",
    `**最优配置：W_VEC=${best.w} / min_sim=${best.minSim} → R@10 = ${pct(best.r10)}（R@5 参考 ${pct(best.r5)}）**`,
    "",
    "注：R@5 为参考口径（top5/最小(5,gold)），不作为门槛——门槛口径变更须经评审。",
  ].join("\n");
  fs.writeFileSync(path.join(EVAL_DIR, "调参矩阵报告.md"), md, "utf8");
  console.log("\n矩阵：");
  matrix.forEach((m) =>
    console.log(
      `  W=${m.w} minSim=${m.minSim} → R@10 ${pct(m.r10)} / R@5 ${pct(m.r5)}`,
    ),
  );
  console.log(`最优：W=${best.w} minSim=${best.minSim} R@10=${pct(best.r10)}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
