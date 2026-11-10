// scripts/eval/grade-worthiness.ts — M2 验收：worthiness 考卷判分（500 句人工金标准 vs 模型分）
//
// 金标准：.local/eval/worthiness-500.csv（是 402 / 否 98，κ=0.813 复标已过）
// 模型分：生产 corpus_clips.worthyScore（T2.3 过夜批，qwen25-14b-awq）
// 判分口径（任务书 §五）：P = 模型判「值得学」中金标准「是」的占比（宁缺勿滥，R 记录后调）；
//   同时扫阈值 0.3-0.7 出 P/R 曲线 → 为 T3.3 门禁选工作点（P≥0.85 约束下最大化 R）。
// 产出：.local/eval/worthiness-grade.md + grade.json
// 跑法：npx tsx scripts/eval/grade-worthiness.ts
import * as fs from "node:fs";
import * as path from "node:path";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

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
  const rows = readCsv("worthiness-500.csv");
  const head = rows[0];
  const iClip = head.indexOf("clipid");
  const iLabel = head.indexOf("值得学(是/否)");
  const gold = rows
    .slice(1)
    .map((r) => ({ clipid: r[iClip], label: r[iLabel].trim() === "是" }));

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const scored = await prisma.corpus_clips.findMany({
    where: { clipid: { in: gold.map((g) => g.clipid) } },
    select: { clipid: true, worthyScore: true },
  });
  const byId = new Map(scored.map((s) => [s.clipid, s.worthyScore]));

  const pct = (v: number) => (Math.round(v * 1000) / 10).toFixed(1) + "%";
  const curve: Array<{ th: number; P: number; R: number; F1: number }> = [];
  for (let th = 0.3; th <= 0.7001; th += 0.05) {
    let tp = 0,
      fp = 0,
      fn = 0;
    for (const g of gold) {
      const s = byId.get(g.clipid);
      if (s == null) {
        fn += g.label ? 1 : 0;
        continue;
      } // 未标注（顽固失败窗）按漏报记
      const pred = s >= th;
      if (pred && g.label) tp++;
      else if (pred && !g.label) fp++;
      else if (!pred && g.label) fn++;
    }
    const P = tp + fp > 0 ? tp / (tp + fp) : 1;
    const R = tp + fp + fn > 0 ? tp / (tp + fp + fn) : 0;
    curve.push({
      th: Math.round(th * 100) / 100,
      P: Math.round(P * 1000) / 1000,
      R: Math.round(R * 1000) / 1000,
      F1: Math.round(((2 * P * R) / (P + R || 1)) * 1000) / 1000,
    });
  }
  const missing = gold.filter((g) => byId.get(g.clipid) == null).length;
  const at05 = curve.find((c) => c.th === 0.5)!;
  const bestUnderGate =
    curve.filter((c) => c.P >= 0.85).sort((a, b) => b.R - a.R)[0] || at05;

  const md = [
    "# worthiness 考卷判分（M2 验收 · P≥0.85）",
    "",
    `> 金标准 500 句（是 402/否 98，κ=0.813）｜模型 qwen25-14b-awq @ corpus-annot-v1｜考卷覆盖缺考 ${missing} 句（顽固失败窗，按漏报计）`,
    "",
    "| 阈值 | P（门槛≥0.85） | R | F1 |",
    "|---|---|---|---|",
    ...curve.map(
      (c) =>
        `| ${c.th} | ${pct(c.P)} ${c.P >= 0.85 ? "✅" : "❌"} | ${pct(c.R)} | ${c.F1} |`,
    ),
    "",
    `**验收判定（th=0.5）：P = ${pct(at05.P)} ${at05.P >= 0.85 ? "✅ 过线" : "❌ 未过"}（R ${pct(at05.R)}）**`,
    `**T3.3 门禁工作点建议：th=${bestUnderGate.th}（P ${pct(bestUnderGate.P)} / R ${pct(bestUnderGate.R)}）**`,
    "",
    `残缺口径：全库 120,201 中 ${120201 - 118232} 句未判（worthyScore=null）——检索面兜底「未判不误杀」（null OR ≥th）。`,
  ].join("\n");
  fs.writeFileSync(path.join(EVAL_DIR, "worthiness-grade.md"), md, "utf8");
  fs.writeFileSync(
    path.join(EVAL_DIR, "grade.json"),
    JSON.stringify({ curve, at05, bestUnderGate, missing }, null, 2),
    "utf8",
  );

  console.log(`考卷覆盖：${500 - missing}/500（缺考 ${missing}）`);
  console.log(
    `th=0.5 验收：P=${pct(at05.P)} ${at05.P >= 0.85 ? "✅" : "❌"} / R=${pct(at05.R)}`,
  );
  console.log(
    `T3.3 建议工作点：th=${bestUnderGate.th}（P ${pct(bestUnderGate.P)} / R ${pct(bestUnderGate.R)}）`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
