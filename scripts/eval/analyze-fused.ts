// scripts/eval/analyze-fused.ts — T2.1①/M3 终算：双路同池公平对比
//
// 金标准扩容 = 旧金标准(gold-baseline.json) ∪ 增量标注相关项
// [2026-11-09 稳定性审计后转正] 增量以复标版(queries-gold-fused-increment-relabel.csv，
// 全新会话独立复标)为正本——原版 82.9%<90% 触发预注册裁决；实质翻转仅 1/1314，
// 漂移属置信度口径（原版敢断、复标守「拿不准标不确定」），复标口径更严格故 gold 更小更稳。
// 同一扩容金标准上分别算：关键词路(baseline-recall.json top10) vs 融合路(fused-recall.json top10)
// 产出：.local/eval/{final-recall.json, 检索终算报告.md}
// 跑法：npx tsx scripts/eval/analyze-fused.ts
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
  // 1) 增量标注回收
  const inc = readCsv("queries-gold-fused-increment-relabel.csv");
  const iHead = inc[0];
  const iQid = iHead.indexOf("query_id");
  const iLabel = iHead.indexOf("标注(相关/不相关/不确定)");
  let incRel = 0,
    incIrrel = 0,
    incUnsure = 0,
    incEmpty = 0;
  const incGold = new Map<number, Set<string>>();
  for (const r of inc.slice(1)) {
    const qid = Number(r[iQid]);
    const v = (r[iLabel] || "").trim();
    if (!v) incEmpty++;
    else if (v === "相关") {
      incRel++;
      if (!incGold.has(qid)) incGold.set(qid, new Set());
    } else if (v === "不相关") incIrrel++;
    else incUnsure++;
  }
  // 相关项需带 clipid（重扫一遍入集）
  const iClip = iHead.indexOf("clipid");
  for (const r of inc.slice(1)) {
    if ((r[iLabel] || "").trim() === "相关")
      incGold.get(Number(r[iQid]))!.add(r[iClip]);
  }
  console.log(
    `增量回收：相关 ${incRel} / 不相关 ${incIrrel} / 不确定 ${incUnsure} / 空 ${incEmpty}`,
  );

  // 2) 扩容金标准
  const goldBase = JSON.parse(
    fs.readFileSync(path.join(EVAL_DIR, "gold-baseline.json"), "utf8"),
  );
  const oldGold = new Map<number, Set<string>>();
  for (const [qid, ids] of Object.entries(
    goldBase.gold as Record<string, string[]>,
  )) {
    oldGold.set(Number(qid), new Set(ids));
  }
  const expGold = new Map<number, Set<string>>();
  for (const qid of new Set([...oldGold.keys(), ...incGold.keys()])) {
    expGold.set(
      qid,
      new Set([...(oldGold.get(qid) || []), ...(incGold.get(qid) || [])]),
    );
  }

  // 3) 双路 top10 对扩容金标准
  const kw = JSON.parse(
    fs.readFileSync(path.join(EVAL_DIR, "baseline-recall.json"), "utf8"),
  );
  const fu = JSON.parse(
    fs.readFileSync(path.join(EVAL_DIR, "fused-recall.json"), "utf8"),
  );
  type QRow = { qid: number; q?: string; category?: string; top10?: string[] };
  const kwByQid = new Map((kw.queries as QRow[]).map((q) => [q.qid, q]));
  const fuByQid = new Map((fu.queries as QRow[]).map((q) => [q.qid, q]));

  const perQuery: Array<{
    qid: number;
    q: string;
    category: string;
    expGold: number;
    oldGold: number;
    newlyMeasurable: boolean;
    kwHits: number;
    kwR10: number | null;
    fuHits: number;
    fuR10: number | null;
  }> = [];
  for (const qid of [...expGold.keys()].sort((a, b) => a - b)) {
    const g = expGold.get(qid)!;
    const k = kwByQid.get(qid),
      f = fuByQid.get(qid);
    const kwHits = ((k?.top10 as string[]) || []).filter((id) =>
      g.has(id),
    ).length;
    const fuHits = ((f?.top10 as string[]) || []).filter((id) =>
      g.has(id),
    ).length;
    perQuery.push({
      qid,
      q: k?.q || f?.q || "",
      category: k?.category || f?.category || "",
      expGold: g.size,
      oldGold: (oldGold.get(qid) || new Set()).size,
      newlyMeasurable: (oldGold.get(qid) || new Set()).size === 0 && g.size > 0,
      kwHits,
      kwR10: g.size ? kwHits / g.size : null,
      fuHits,
      fuR10: g.size ? fuHits / g.size : null,
    });
  }
  const measurable = perQuery.filter((p) => p.expGold > 0);
  const mean = (arr: Array<number | null>) => {
    const v = arr.filter((x): x is number => x !== null);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0;
  };
  const kwMean = mean(measurable.map((p) => p.kwR10));
  const fuMean = mean(measurable.map((p) => p.fuR10));
  const newlyMeas = measurable.filter((p) => p.newlyMeasurable);

  // 分类别（融合口径）
  const byCat = new Map<string, { n: number; kw: number; fu: number }>();
  for (const p of measurable) {
    if (!byCat.has(p.category)) byCat.set(p.category, { n: 0, kw: 0, fu: 0 });
    const e = byCat.get(p.category)!;
    e.n++;
    e.kw += p.kwR10 as number;
    e.fu += p.fuR10 as number;
  }

  const pct = (v: number) => (Math.round(v * 1000) / 10).toFixed(1) + "%";
  const result = {
    generatedAt: new Date().toISOString(),
    goldProtocol: "TREC 并池扩容：旧金标准 ∪ 融合增量相关项（同尺同卷）",
    increment: {
      rel: incRel,
      irrel: incIrrel,
      unsure: incUnsure,
      empty: incEmpty,
    },
    summary: {
      measurable: measurable.length,
      newlyMeasurable: newlyMeas.length,
      expGoldTotal: measurable.reduce((s, p) => s + p.expGold, 0),
      keywordR10: Math.round(kwMean * 1000) / 1000,
      fusedR10: Math.round(fuMean * 1000) / 1000,
      gate: 0.7,
    },
    perQuery,
  };
  fs.writeFileSync(
    path.join(EVAL_DIR, "final-recall.json"),
    JSON.stringify(result, null, 2),
    "utf8",
  );

  const md = [
    "# 检索终算报告——双路同池公平对比（M3 验收卷）",
    "",
    `> 生成：${result.generatedAt} ｜ 金标准扩容：旧 88 相关 + 增量相关 ${incRel} = ${measurable.reduce((s, p) => s + p.expGold, 0)} 条 ｜ 增量标注质量：不相关 ${incIrrel} / 不确定 ${incUnsure}`,
    "",
    "## 总裁决",
    "",
    `| 检索路 | Recall@10（可测 ${measurable.length}/50） | M3 门槛 70% |`,
    `|---|---|---|`,
    `| 关键词路 v1（基线） | ${pct(kwMean)} | ${kwMean >= 0.7 ? "✅" : "❌"} |`,
    `| **融合路 v1（+BGE-M3 向量）** | **${pct(fuMean)}** | ${fuMean >= 0.7 ? "✅ 达标" : "❌ 未达"} |`,
    "",
    `- 融合路相对基线：**${fuMean >= kwMean ? "+" : ""}${pct(fuMean - kwMean)}**`,
    `- 新增可测 query：**${newlyMeas.length} 条**（旧金标准池内零相关、向量捞回了相关内容的场景${newlyMeas.length ? "：" + newlyMeas.map((p) => "#" + p.qid).join("/") : ""}）`,
    "",
    "## 分类别（可测口径）",
    "",
    "| 类别 | n | 关键词 R@10 | 融合 R@10 | Δ |",
    "|---|---|---|---|---|",
    ...[...byCat.entries()]
      .map(
        ([c, e]) =>
          `| ${c} | ${e.n} | ${pct(e.kw / e.n)} | ${pct(e.fu / e.n)} | ${e.fu >= e.kw ? "+" : ""}${pct((e.fu - e.kw) / e.n)} |`,
      )
      .sort(),
    "",
    "## 逐 query 明细（融合路）",
    "",
    "| # | query | 扩容gold | kw命中 | 融合命中 | 融合R@10 |",
    "|---|---|---|---|---|---|",
    ...measurable.map(
      (p) =>
        `| ${p.qid} | ${p.q} | ${p.expGold} | ${p.kwHits} | ${p.fuHits} | ${pct(p.fuR10 as number)} |`,
    ),
  ].join("\n");
  fs.writeFileSync(path.join(EVAL_DIR, "检索终算报告.md"), md, "utf8");

  console.log(
    `\n终算（可测 ${measurable.length}/50，新增可测 ${newlyMeas.length}）：`,
  );
  console.log(`  关键词路 R@10 = ${pct(kwMean)}`);
  console.log(
    `  融合路   R@10 = ${pct(fuMean)}（Δ ${fuMean >= kwMean ? "+" : ""}${pct(fuMean - kwMean)}，门槛 70% ${fuMean >= 0.7 ? "达标 ✅" : "未达 ❌"}）`,
  );
  console.log("产出：final-recall.json + 检索终算报告.md");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
