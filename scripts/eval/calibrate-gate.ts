// scripts/eval/calibrate-gate.ts — noMatch 门的确定性阈值校准（替代 LLM 快裁）
//
// 地面真值：relabel 正本金标准——每条 query 的 top-5 里是否存在金标准相关项
//   → match（应放行）或 noMatch（应拦截）。扫 (sim阈值 S × 证据阈值 E)：
//   放行条件 = top-5 中任一条 sim≥S 或 evidence≥E。
// 目标：真 noMatch query（金标准 zero）零误放 + 真 match query 最大召回。
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

const STOP = new Set([
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
const WEAK = new Set([
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
const pcw = (p: string) =>
  p
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOP.has(w) && !WEAK.has(w));
const zhGrams = (q: string) => {
  if (!/^[\u4e00-\u9fa5\s]+$/.test(q)) return [];
  const g: string[] = [];
  for (let i = 0; i < q.length - 1; i++)
    if (!g.includes(q.slice(i, i + 2))) g.push(q.slice(i, i + 2));
  return g.slice(0, 6);
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

  // relabel 正本金标准
  const goldBase = JSON.parse(
    fs.readFileSync(path.join(EVAL_DIR, "gold-baseline.json"), "utf8"),
  );
  const gold = new Map<number, Set<string>>();
  for (const [qid, ids] of Object.entries(
    goldBase.gold as Record<string, string[]>,
  ))
    gold.set(Number(qid), new Set(ids));
  const inc = fs
    .readFileSync(
      path.join(EVAL_DIR, "queries-gold-fused-increment-relabel.csv"),
      "utf8",
    )
    .replace(/^\uFEFF/, "")
    .split("\n")
    .slice(1);
  for (const line of inc) {
    const cols: string[] = [];
    let f = "",
      q = false;
    for (const ch of line) {
      if (q) {
        if (ch === '"') q = false;
        else f += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") {
        cols.push(f);
        f = "";
      } else f += ch;
    }
    cols.push(f);
    if ((cols[9] || "").trim() === "相关") {
      const qid = Number(cols[0]);
      if (!gold.has(qid)) gold.set(qid, new Set());
      gold.get(qid)!.add(cols[4]);
    }
  }

  const baseline = JSON.parse(
    fs.readFileSync(path.join(EVAL_DIR, "baseline-recall.json"), "utf8"),
  );
  type Row = {
    clipid: string;
    episodeid: string;
    enText: string;
    zhText: string | null;
    wpm: number;
    duration: number;
  };
  const SELECT = {
    clipid: true,
    episodeid: true,
    enText: true,
    zhText: true,
    wpm: true,
    duration: true,
  };

  interface QTruth {
    qid: number;
    truth: "match" | "nomatch";
    top5: Array<{ sim: number; ev: number }>;
  }
  const truths: QTruth[] = [];

  for (const b of baseline.queries as Array<{
    qid: number;
    q: string;
    phrases: string[];
    zhWords: string[];
  }>) {
    const { q, phrases, zhWords } = b;
    const keywords: string[] = [];
    phrases.map(pcw).forEach((ws) =>
      ws.forEach((w) => {
        if (!keywords.includes(w)) keywords.push(w);
      }),
    );
    const grams = zhGrams(q);
    const wb = (h: string, n: string) =>
      new RegExp(`\\b${esc(n)}\\b`, "i").test(h);
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
      select: SELECT,
      orderBy: { wpm: "asc" },
      take: 300,
    });
    const usable: Row[] = rows.filter(
      (r) =>
        !isJunkClip({ enText: r.enText, duration: r.duration, wpm: r.wpm }) &&
        !hasSensitiveTerm(r.enText) &&
        !hasSensitiveTerm(r.zhText) &&
        (phrases.some((p) => wb(r.enText, p)) ||
          keywords.some((k) => wb(r.enText, k)) ||
          !!r.zhText!.includes(q) ||
          zhWords.some((w) => r.zhText!.includes(w)) ||
          grams.some((g) => r.zhText!.includes(g))),
    );
    const qv = await embedQuery(q);
    const sim = new Map<string, number>();
    if (qv) {
      (await clipEmbeddingRepo.nearestClips(qv, 60)).forEach((h) =>
        sim.set(h.id, h.similarity),
      );
      const ids = new Set(usable.map((r) => r.clipid));
      const missing = [...sim.keys()].filter((id) => !ids.has(id)).slice(0, 40);
      if (missing.length) {
        (
          await prisma.corpus_clips.findMany({
            where: { clipid: { in: missing } },
            select: SELECT,
          })
        ).forEach((r) => {
          if (
            !isJunkClip({
              enText: r.enText,
              duration: r.duration,
              wpm: r.wpm,
            }) &&
            !hasSensitiveTerm(r.enText) &&
            !hasSensitiveTerm(r.zhText)
          )
            usable.push(r);
        });
      }
    }
    const ctx = {
      phrases,
      perPhraseWords: phrases.map(pcw),
      query: q,
      grams: [...zhWords, ...grams],
    };
    const scored = usable
      .map((r) => ({
        r,
        s:
          scoreSemanticClip(r, ctx) +
          ((sim.get(r.clipid) ?? -1) >= 0.3
            ? (sim.get(r.clipid) as number) * 35
            : 0),
      }))
      .sort((a, b2) => b2.s - a.s);
    const perEp = new Map<string, number>();
    const top5: QTruth["top5"] = [];
    const g = gold.get(b.qid) || new Set<string>();
    let hasGold = false;
    for (const { r } of scored) {
      const c = perEp.get(r.episodeid) || 0;
      if (c >= 2) continue;
      perEp.set(r.episodeid, c + 1);
      if (g.has(r.clipid)) hasGold = true;
      top5.push({ sim: sim.get(r.clipid) ?? 0, ev: scoreSemanticClip(r, ctx) });
      if (top5.length >= 5) break;
    }
    truths.push({
      qid: b.qid,
      truth: g.size > 0 && hasGold ? "match" : "nomatch",
      top5,
    });
  }

  // 注：金标准 zero 的 query 一定判 nomatch（top5 不可能含金标准项）——
  // 但「有金标准但 top5 未含」也判 nomatch（检索力不足，门应拦截——诚实）
  const nMatch = truths.filter((t) => t.truth === "match").length;
  console.log(
    `地面真值：match(应放行) ${nMatch} / noMatch(应拦截) ${truths.length - nMatch}\n`,
  );
  console.log("| S\\E | 40 | 52 | 64 |");
  console.log("|---|---|---|---|");
  const results: Array<{
    S: number;
    E: number;
    acc: number;
    fp: number;
    fn: number;
  }> = [];
  for (const S of [0.55, 0.58, 0.6, 0.62, 0.65, 0.68]) {
    const cells: string[] = [];
    for (const E of [40, 52, 64]) {
      let fp = 0,
        fn = 0,
        ok = 0;
      for (const t of truths) {
        const pass = t.top5.some((x) => x.sim >= S || x.ev >= E);
        if (t.truth === "nomatch") {
          if (pass) fp++;
          else ok++;
        } else {
          if (pass) ok++;
          else fn++;
        }
      }
      const acc = ok / truths.length;
      results.push({ S, E, acc, fp, fn });
      cells.push(`${(acc * 100).toFixed(0)}%(误放${fp}/漏${fn})`);
    }
    console.log(`| ${S} | ${cells.join(" | ")} |`);
  }
  const best = results.reduce((a, b) =>
    b.fp < a.fp
      ? b
      : b.fp === a.fp && b.fn < a.fn
        ? b
        : b.fp === a.fp && b.fn === a.fn && b.acc > a.acc
          ? b
          : a,
  );
  console.log(
    `\n最优（零误放优先）：S=${best.S} E=${best.E} → 准确 ${(best.acc * 100).toFixed(1)}%（误放 ${best.fp} / 漏拦后放 ${best.fn}）`,
  );
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
