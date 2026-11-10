// scripts/eval/gen-worthiness.ts — T2.1② worthiness 标注集分层抽样（500 句）
//
// 分层矩阵（7 层配额 500，短句/长句/快语速风险面全部入池）：
//   s1 3-6s×5-9词 90（碎句风险） s2 3-6s×10-18词 70  s3 6-10s×10-18词 120（主力形态）
//   s4 6-10s×19+词 60  s5 10-15s×10-18词 60  s6 10-15s×19+词 60  s7 wpm≥200 快语速 40
// 产出：.local/eval/worthiness-500.csv（UTF-8 BOM，标注列留空）
// 跑法：npx tsx scripts/eval/gen-worthiness.ts
import * as fs from "node:fs";
import * as path from "node:path";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const STRATA = [
  { s: "s1_短句少词", dur: [3, 6], wc: [5, 9], wpm: [90, 240], quota: 90 },
  { s: "s2_短句中词", dur: [3, 6], wc: [10, 18], wpm: [90, 240], quota: 70 },
  { s: "s3_主力形态", dur: [6, 10], wc: [10, 18], wpm: [90, 240], quota: 120 },
  { s: "s4_中句长词", dur: [6, 10], wc: [19, 106], wpm: [90, 240], quota: 60 },
  { s: "s5_长句中词", dur: [10, 15], wc: [10, 18], wpm: [90, 240], quota: 60 },
  { s: "s6_长句长词", dur: [10, 15], wc: [19, 106], wpm: [90, 240], quota: 60 },
  { s: "s7_快语速", dur: [3, 15], wc: [5, 106], wpm: [200, 240], quota: 40 },
];

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const rows: string[] = [
    "idx,分层,clipid,difficulty,wpm,duration_sec,wordCount,enText,zhText,值得学(是/否),备注",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  let idx = 0;
  const seen = new Set<string>();

  for (const st of STRATA) {
    const picked = await prisma.$queryRaw<
      Array<{
        clipid: string;
        cefrLevel: string | null;
        wpm: number;
        duration: number;
        wordCount: number;
        enText: string;
        zhText: string | null;
      }>
    >`SELECT clipid, "cefrLevel", wpm, duration, "wordCount", "enText", "zhText"
       FROM corpus_clips
       WHERE duration >= ${st.dur[0]} AND duration < ${st.dur[1]}
         AND "wordCount" BETWEEN ${st.wc[0]} AND ${st.wc[1]}
         AND wpm BETWEEN ${st.wpm[0]} AND ${st.wpm[1]}
         AND "zhText" IS NOT NULL
       ORDER BY random() LIMIT ${st.quota * 2}`;
    let taken = 0;
    for (const r of picked) {
      if (taken >= st.quota) break;
      if (seen.has(r.clipid)) continue;
      seen.add(r.clipid);
      taken++;
      idx++;
      rows.push(
        [
          idx,
          st.s,
          r.clipid,
          r.cefrLevel || "",
          r.wpm,
          r.duration.toFixed(2),
          r.wordCount,
          esc(r.enText),
          esc(r.zhText),
          "",
          "",
        ].join(","),
      );
    }
    console.log(`${st.s}: 取 ${taken}/${st.quota}`);
  }

  const outDir = path.join(process.cwd(), ".local", "eval");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "worthiness-500.csv"),
    "\uFEFF" + rows.join("\n"),
    "utf8",
  );
  console.log(`产出：worthiness-500.csv（${idx} 句）→ .local/eval/`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
