// scripts/eval/analyze-agreement.ts — 标注稳定性审计：双跑一致率 + Cohen's κ
//
// 任务A（检索增量）：queries-gold-fused-increment.csv（同会话原版）
//                 vs queries-gold-fused-increment-relabel.csv（新会话洗版复标）
//   按 (query_id, clipid) 连接，三态标签（相关/不相关/不确定）
//   裁决口径：一致率 ≥90% → 保留原版（溯源升级为"强模型独立双跑一致"）
//            <90% → 复标版成为金标准正本 + 漂移样本逐条复核
// 任务B（worthiness）：worthiness-500.csv vs worthiness-relabel-100.csv
//   按 clipid 连接（100 行子集），二态标签（是/否）
//   裁决口径：κ≥0.75 → 500 句金标准可用（M2 LLM 验收集）
//            κ<0.75 → 修 rubric 后再复标
// 产出：.local/eval/agreement-report.md（两任务各自的 κ/一致率/混淆矩阵/漂移样本）
// 跑法：npx tsx scripts/eval/analyze-agreement.ts（缺文件的任务自动跳过）
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

/** Cohen's κ（无权重）+ 一致率；labels 为固定标签集 */
function kappa(a: string[], b: string[], labels: string[]) {
  const n = a.length;
  let agree = 0;
  const conf = new Map<string, number>(); // "a|b" → count
  const distA = new Map<string, number>();
  const distB = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) agree++;
    conf.set(`${a[i]}|${b[i]}`, (conf.get(`${a[i]}|${b[i]}`) || 0) + 1);
    distA.set(a[i], (distA.get(a[i]) || 0) + 1);
    distB.set(b[i], (distB.get(b[i]) || 0) + 1);
  }
  const po = n ? agree / n : 0;
  let pe = 0;
  for (const l of labels) {
    pe += ((distA.get(l) || 0) / n) * ((distB.get(l) || 0) / n);
  }
  const k = pe < 1 ? (po - pe) / (1 - pe) : 1;
  return { n, agree, po, kappa: k, conf, distA, distB };
}

function pct(v: number) {
  return (Math.round(v * 1000) / 10).toFixed(1) + "%";
}

const md: string[] = ["# 标注稳定性审计（双跑一致率 + Cohen's κ）", ""];
const log = (...parts: string[]) => {
  const s = parts.join("\n");
  console.log(s);
  md.push(s);
};

async function main() {
  const genAt = new Date().toISOString();
  log(
    `> 生成：${genAt} ｜ 协议：同 rubric（标注标准.md）、独立全新会话、乱序+空列复标`,
  );

  // ── 任务A：检索增量 双跑 ──
  const A_SRC = "queries-gold-fused-increment.csv";
  const A_DST = "queries-gold-fused-increment-relabel.csv";
  if (fs.existsSync(path.join(EVAL_DIR, A_DST))) {
    log("", "## 任务A：检索池增量 1,314 条双跑（三态）", "");
    const src = readCsv(A_SRC);
    const dst = readCsv(A_DST);
    const iQ = src[0].indexOf("query_id");
    const iC = src[0].indexOf("clipid");
    const iL = src[0].indexOf("标注(相关/不相关/不确定)");
    const iEn = src[0].indexOf("enText");
    const dL = dst[0].indexOf("标注(相关/不相关/不确定)");
    const mapA = new Map<string, { label: string; en: string }>();
    for (const r of src.slice(1)) {
      if (r.length > 1)
        mapA.set(`${r[iQ]}|${r[iC]}`, {
          label: (r[iL] || "").trim(),
          en: r[iEn] || "",
        });
    }
    const labels = ["相关", "不相关", "不确定"];
    const a: string[] = [];
    const b: string[] = [];
    const drift: Array<{ en: string; from: string; to: string; qid: string }> =
      [];
    let unfilled = 0;
    let unmatched = 0;
    for (const r of dst.slice(1)) {
      if (r.length <= 1) continue;
      const key = `${r[iQ]}|${r[iC]}`;
      const orig = mapA.get(key);
      if (!orig) {
        unmatched++;
        continue;
      }
      const lab2 = (r[dL] || "").trim();
      if (!lab2) {
        unfilled++;
        continue;
      }
      if (!labels.includes(lab2)) continue;
      a.push(orig.label);
      b.push(lab2);
      if (orig.label !== lab2)
        drift.push({ en: orig.en, from: orig.label, to: lab2, qid: r[iQ] });
    }
    const st = kappa(a, b, labels);
    if (st.n === 0) {
      log(
        `- ⏳ 复标未回收（未填 ${unfilled} 格）——Codex 跑完 relabel 文件后再执行本脚本`,
      );
    } else {
      log(
        `- 连接成功 ${st.n} 对（未匹配 ${unmatched}｜复标未填 ${unfilled}——须为 0 才有效）`,
      );
      log(
        `- **一致率 ${pct(st.po)}（${st.agree}/${st.n}）｜Cohen's κ = ${st.kappa.toFixed(3)}**`,
      );
      log(
        `- 裁决口径：一致率 ≥90% → 保留原版，溯源升级「强模型独立双跑一致」；<90% → 复标版转正 + 漂移复核`,
      );
      log(
        `- **裁决：${st.po >= 0.9 ? "✅ ≥90%，保留原版" : "❌ <90%，复标版转正并逐条复核漂移"}**`,
        "",
      );
      log("混淆矩阵（行=原版，列=复标）：", "");
      log("| 原\\复 | " + labels.join(" | ") + " |");
      log("|---|---|---|---|");
      for (const la of labels) {
        log(
          `| ${la} | ` +
            labels
              .map((lb) => String(st.conf.get(`${la}|${lb}`) || 0))
              .join(" | ") +
            " |",
        );
      }
      log("", `漂移样本（前 12 条，共 ${drift.length}）：`, "");
      drift
        .slice(0, 12)
        .forEach((d) =>
          log(`- q${d.qid} [${d.from}→${d.to}] ${d.en.slice(0, 56)}`),
        );
    }
    log("");
  } else {
    log(
      "",
      "## 任务A：跳过（未找到 queries-gold-fused-increment-relabel.csv）",
      "",
    );
  }

  // ── 任务B：worthiness 复标 ──
  const B_SRC = "worthiness-500.csv";
  const B_DST = "worthiness-relabel-100.csv";
  if (fs.existsSync(path.join(EVAL_DIR, B_DST))) {
    log("## 任务B：worthiness 复标 100 句（二态）", "");
    const src = readCsv(B_SRC);
    const dst = readCsv(B_DST);
    const iC = src[0].indexOf("clipid");
    const iL = src[0].indexOf("值得学(是/否)");
    const dC = dst[0].indexOf("clipid");
    const dL = dst[0].findIndex((h) => h.includes("值得学"));
    const mapB = new Map<string, string>();
    for (const r of src.slice(1)) {
      if (r.length > 1) mapB.set(r[iC], (r[iL] || "").trim());
    }
    const labels = ["是", "否"];
    const a: string[] = [];
    const b: string[] = [];
    let unfilled = 0;
    for (const r of dst.slice(1)) {
      if (r.length <= 1) continue;
      const orig = mapB.get(r[dC]);
      if (!orig) continue;
      const lab2 = (r[dL] || "").trim();
      if (!lab2) {
        unfilled++;
        continue;
      }
      a.push(orig);
      b.push(lab2);
    }
    const st = kappa(a, b, labels);
    if (st.n === 0) {
      log(
        `- ⏳ 复标未回收（未填 ${unfilled} 格）——Codex 跑完 relabel 文件后再执行本脚本`,
      );
    } else {
      log(`- 连接成功 ${st.n} 对（复标未填 ${unfilled}——须为 0 才有效）`);
      log(
        `- **一致率 ${pct(st.po)}（${st.agree}/${st.n}）｜Cohen's κ = ${st.kappa.toFixed(3)}**`,
      );
      log(
        `- 裁决口径：κ≥0.75 → 500 句金标准可用（M2 LLM 验收集）；<0.75 → 修 rubric 再复标`,
      );
      log(
        `- **裁决：${st.kappa >= 0.75 ? "✅ κ≥0.75，金标准可用" : "❌ κ<0.75，修 rubric 后再复标"}**`,
        "",
      );
      log("混淆矩阵（行=原版，列=复标）：", "");
      log("| 原\\复 | 是 | 否 |");
      log("|---|---|---|");
      for (const la of labels) {
        log(
          `| ${la} | ` +
            labels
              .map((lb) => String(st.conf.get(`${la}|${lb}`) || 0))
              .join(" | ") +
            " |",
        );
      }
    }
    log("");
  } else {
    log("## 任务B：跳过（未找到 worthiness-relabel-100.csv）", "");
  }

  fs.writeFileSync(
    path.join(EVAL_DIR, "agreement-report.md"),
    md.join("\n") + "\n",
    "utf8",
  );
  console.log("\n产出：.local/eval/agreement-report.md");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
