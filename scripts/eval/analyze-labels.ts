// scripts/eval/analyze-labels.ts — T2.1①② 标注回收分析
//
// 输入：.local/eval/{queries-gold.csv, baseline-recall.json, worthiness-500.csv}
// 产出：
//   .local/eval/gold-baseline.json      — 金标准 + 关键词路 Recall@10 基线（M3 同池可比）
//   .local/eval/检索基线报告.md          — 人读报告（总览/分类/坏例对比/池内无相关清单）
//   .local/eval/worthiness-relabel-100.csv — 一周后复标样本（今日锁定抽样，防选择性记忆）
// 跑法：npx tsx scripts/eval/analyze-labels.ts
import * as fs from "node:fs";
import * as path from "node:path";

const EVAL_DIR = path.join(process.cwd(), ".local", "eval");

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

async function main() {
  // ── ① 检索金标准 + Recall@10 基线 ──
  const qRows = readCsv("queries-gold.csv");
  const qHead = qRows[0];
  const iQid = qHead.indexOf("query_id");
  const iClip = qHead.indexOf("clipid");
  const iLabel = qHead.indexOf("标注(相关/不相关/不确定)");
  const gold = new Map<number, Set<string>>(); // qid → 相关 clipid
  const stats = new Map<number, { rel: number; pool: number }>();
  for (const r of qRows.slice(1)) {
    const qid = Number(r[iQid]);
    if (!stats.has(qid)) stats.set(qid, { rel: 0, pool: 0 });
    const s = stats.get(qid)!;
    s.pool++;
    if (r[iLabel].trim() === "相关") {
      s.rel++;
      if (!gold.has(qid)) gold.set(qid, new Set());
      gold.get(qid)!.add(r[iClip]);
    }
  }

  const baseline = JSON.parse(
    fs.readFileSync(path.join(EVAL_DIR, "baseline-recall.json"), "utf8"),
  ) as {
    queries: Array<{
      qid: number;
      q: string;
      category: string;
      note: string | null;
      top10: string[];
      pool_size: number;
    }>;
  };

  const perQuery = baseline.queries.map((b) => {
    const g = gold.get(b.qid) || new Set<string>();
    const hits = b.top10.filter((id) => g.has(id)).length;
    return {
      qid: b.qid,
      q: b.q,
      category: b.category,
      note: b.note,
      goldSize: g.size,
      poolSize: b.pool_size,
      top10Hits: hits,
      recall10: g.size > 0 ? hits / g.size : null,
      relevantInPool: g.size,
    };
  });
  const measurable = perQuery.filter((p) => p.goldSize > 0);
  const meanRecall = measurable.length
    ? measurable.reduce((s, p) => s + (p.recall10 as number), 0) /
      measurable.length
    : 0;
  const byCategory = new Map<
    string,
    { n: number; sum: number; unmeasurable: number }
  >();
  for (const p of perQuery) {
    const c = p.category;
    if (!byCategory.has(c))
      byCategory.set(c, { n: 0, sum: 0, unmeasurable: 0 });
    const e = byCategory.get(c)!;
    if (p.recall10 !== null) {
      e.n++;
      e.sum += p.recall10;
    } else e.unmeasurable++;
  }
  const byNote = new Map<string, { n: number; sum: number }>();
  for (const p of measurable) {
    const k = p.note || "normal";
    if (!byNote.has(k)) byNote.set(k, { n: 0, sum: 0 });
    byNote.get(k)!.n++;
    byNote.get(k)!.sum += p.recall10 as number;
  }
  const zeroGold = perQuery.filter((p) => p.goldSize === 0);

  fs.writeFileSync(
    path.join(EVAL_DIR, "gold-baseline.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        lane: "keyword v1（DeepSeek phrases+zhWords + rankSemanticClips；top-30 池化）",
        gold: Object.fromEntries(
          [...gold.entries()].map(([k, v]) => [k, [...v]]),
        ),
        perQuery,
        summary: {
          queries: perQuery.length,
          measurable: measurable.length,
          zeroGoldInPool: zeroGold.length,
          meanRecall10: Math.round(meanRecall * 1000) / 1000,
          poolRelevantTotal: perQuery.reduce((s, p) => s + p.goldSize, 0),
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  // ── ② worthiness 分布 + 复标样本锁定 ──
  const wRows = readCsv("worthiness-500.csv");
  const wHead = wRows[0];
  const iStratum = wHead.indexOf("分层");
  const iWLabel = wHead.indexOf("值得学(是/否)");
  const byStratum = new Map<string, { yes: number; no: number }>();
  let yes = 0,
    no = 0;
  for (const r of wRows.slice(1)) {
    const s = r[iStratum];
    if (!byStratum.has(s)) byStratum.set(s, { yes: 0, no: 0 });
    const v = r[iWLabel].trim();
    if (v === "是") {
      byStratum.get(s)!.yes++;
      yes++;
    } else if (v === "否") {
      byStratum.get(s)!.no++;
      no++;
    }
  }
  // 复标样本：从 500 中随机抽 100，乱序成新表（今日锁定）
  const idx = wRows.slice(1).map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const relabel = idx.slice(0, 100).map((i) => wRows[i + 1]);
  const rlRows = [
    wHead.map((h, c) => (c === iWLabel ? "值得学_复标(是/否)" : h)).join(","),
  ].concat(
    relabel.map((r) =>
      r
        .map((v, c) =>
          c === iWLabel
            ? ""
            : /[",\n]/.test(v)
              ? `"${v.replace(/"/g, '""')}"`
              : v,
        )
        .join(","),
    ),
  );
  fs.writeFileSync(
    path.join(EVAL_DIR, "worthiness-relabel-100.csv"),
    "\uFEFF" + rlRows.join("\n"),
    "utf8",
  );

  // ── 人读报告 ──
  const pct = (v: number) => (Math.round(v * 1000) / 10).toFixed(1) + "%";
  const md = [
    "# 检索基线报告（关键词路 v1 · M3 向量路的对照基线）",
    "",
    `> 生成：${new Date().toISOString()} ｜ 标注：queries-gold.csv 1,488 行全标 ｜ 池化：DeepSeek 双语扩词 top-30`,
    "",
    "## 总览",
    "",
    `- **可测 query（池内 ≥1 相关）：${measurable.length}/50**；池内零相关 ${zeroGold.length} 条（金标准无法度量该场景，列入语料覆盖缺口）`,
    `- **关键词路 Recall@10 基线：${pct(meanRecall)}**（门槛线 M3：≥70%）——${meanRecall >= 0.7 ? "已达标" : "未达标，差距即向量检索的提升空间"}`,
    `- 池内相关总数 ${perQuery.reduce((s, p) => s + p.goldSize, 0)} 条（池相关率 ${((88 / 1488) * 100).toFixed(1)}%）`,
    "",
    "## 分类别 Recall@10（可测口径）",
    "",
    "| 类别 | 可测 n | 平均 Recall@10 | 池内零相关 |",
    "|---|---|---|---|",
    ...[...byCategory.entries()]
      .map(
        ([c, e]) =>
          `| ${c} | ${e.n} | ${e.n ? pct(e.sum / e.n) : "—"} | ${e.unmeasurable} |`,
      )
      .sort(),
    "",
    "## 特殊样本对比（坏例 vs 实测例 vs 常规）",
    "",
    "| 样本 | n | 平均 Recall@10 |",
    "|---|---|---|",
    ...[...byNote.entries()].map(
      ([k, e]) => `| ${k} | ${e.n} | ${pct(e.sum / e.n)} |`,
    ),
    "",
    "## 池内零相关清单（语料覆盖缺口，M0 补欠账后仍缺的主题面）",
    "",
    ...(zeroGold.length
      ? zeroGold.map(
          (p) =>
            `- #${p.qid} [${p.category}] ${p.q}（池 ${p.poolSize} 条全不相关）`,
        )
      : ["（无）"]),
    "",
    "## worthiness 500 句标注分布（M2 LLM 验收集就绪；κ 待一周后复标）",
    "",
    `总计：是 ${yes} / 否 ${no}（值得学率 ${pct(yes / 500)}）`,
    "",
    "| 分层 | 是 | 否 | 否率 |",
    "|---|---|---|---|",
    ...[...byStratum.entries()].map(
      ([s, e]) =>
        `| ${s} | ${e.yes} | ${e.no} | ${pct(e.no / (e.yes + e.no))} |`,
    ),
    "",
    "复标样本已锁定：`worthiness-relabel-100.csv`（100 句乱序，一周后标注 → Cohen's κ ≥ 0.75 才可用）",
  ].join("\n");
  fs.writeFileSync(path.join(EVAL_DIR, "检索基线报告.md"), md, "utf8");

  console.log(
    `① Recall@10 基线：${pct(meanRecall)}（可测 ${measurable.length}/50，池内零相关 ${zeroGold.length}）`,
  );
  console.log(
    `② worthiness：是 ${yes}/否 ${no}；复标 100 句已锁定 → worthiness-relabel-100.csv`,
  );
  console.log("产出：gold-baseline.json + 检索基线报告.md");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
