// scripts/eval/make-relabel-wash.ts — 生成 fused-increment 复标洗版文件
//
// 目的：把 queries-gold-fused-increment.csv（同会话污染版）复制为乱序+空标注列的
// 复标底稿——供全新 Codex 会话（仅喂 标注标准.md + 本文件）独立重标，
// 之后 analyze-agreement.ts 对比双跑一致率裁决金标准去留。
// 原文件保持不动（作为对比侧）。
// 产出：.local/eval/queries-gold-fused-increment-relabel.csv（BOM，乱序，标注列空）
// 跑法：npx tsx scripts/eval/make-relabel-wash.ts
import * as fs from "node:fs";
import * as path from "node:path";

const EVAL_DIR = path.join(process.cwd(), ".local", "eval");
const SRC = "queries-gold-fused-increment.csv";
const DST = "queries-gold-fused-increment-relabel.csv";

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

function writeCsv(f: string, rows: string[][]) {
  const body = rows
    .map((r) =>
      r
        .map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
        .join(","),
    )
    .join("\n");
  fs.writeFileSync(path.join(EVAL_DIR, f), "\uFEFF" + body, "utf8");
}

async function main() {
  const rows = readCsv(SRC);
  const head = rows[0];
  const iLabel = head.indexOf("标注(相关/不相关/不确定)");
  if (iLabel < 0) throw new Error("找不到标注列");

  // 数据行乱序（Fisher-Yates）+ 标注列清空 + 备注改为复标标记
  const data = rows.slice(1).filter((r) => r.length > 1);
  for (let i = data.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [data[i], data[j]] = [data[j], data[i]];
  }
  let blanked = 0;
  for (const r of data) {
    if ((r[iLabel] || "").trim()) blanked++;
    r[iLabel] = "";
  }
  writeCsv(DST, [head, ...data]);
  console.log(
    `洗版完成：${DST}（${data.length} 行乱序，清空标注 ${blanked} 格）`,
  );
  console.log(`原文件 ${SRC} 未动（作为一致率对比侧）`);

  // 顺带核查 relabel-100 现状（应当已是空标注列 + 乱序）
  const w = readCsv("worthiness-relabel-100.csv");
  const wHead = w[0];
  const wi = wHead.findIndex((h) => h.includes("值得学"));
  const wData = w.slice(1).filter((r) => r.length > 1);
  const wFilled = wData.filter((r) => (r[wi] || "").trim()).length;
  console.log(
    `worthiness-relabel-100.csv：${wData.length} 行，标注列已填 ${wFilled} 格（应为 0 即无需再洗）`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
