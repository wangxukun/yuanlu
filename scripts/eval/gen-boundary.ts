// scripts/eval/gen-boundary.ts — T2.1③ 边界人听集（200 句 × 双 padding 盲测 A/B）
//
// 抽样：按时长分层 3-5s×80 / 5-8s×80 / 8-15s×40（短句截尾风险最高故超配）；
// 本地 FFmpeg 双版切片（与网关 buildFfmpegArgs 同参数链：input seek + 64k/24k/mono
// + 150ms 双端淡出），唯一变量 = padding：
//   cur = [start-0.25, end+0.35]（现役）   alt = [start-0.15, end+0.25]（二评备选）
// A/B 命名随机盲测（映射存 key.json，标完才许看）。
// 产出：.local/eval/boundary-200/q{NNN}{A|B}.mp3 + sheet.csv + key.json
// 跑法：npx tsx scripts/eval/gen-boundary.ts（400 次切片约 10-20 分钟）
import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const STRATA = [
  { s: "b1_3-5s", dur: [3, 5], quota: 80 },
  { s: "b2_5-8s", dur: [5, 8], quota: 80 },
  { s: "b3_8-15s", dur: [8, 15], quota: 40 },
];
const PADS = { cur: [0.25, 0.35], alt: [0.15, 0.25] } as const;

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
      if (stderr.length > 4000) stderr = stderr.slice(-2000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-300)}`));
    });
  });
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const { generateSignatureUrl } = await import("../../lib/oss");

  // 分层抽样（带剧集音源，保证可切）
  const picked: Array<{
    clipid: string;
    episodeid: string;
    startTime: number;
    endTime: number;
    enText: string;
    zhText: string | null;
    sourceKey: string | null;
    sourceUrl: string;
    stratum: string;
  }> = [];
  const seen = new Set<string>();
  for (const st of STRATA) {
    const rows = await prisma.$queryRaw<
      Array<{
        clipid: string;
        episodeid: string;
        startTime: number;
        endTime: number;
        enText: string;
        zhText: string | null;
        audioFileName: string | null;
        audioUrl: string;
      }>
    >`SELECT c.clipid, c.episodeid, c."startTime", c."endTime", c."enText", c."zhText",
             e."audioFileName", e."audioUrl"
       FROM corpus_clips c JOIN episode e ON e.episodeid = c.episodeid
       WHERE c.duration >= ${st.dur[0]} AND c.duration < ${st.dur[1]} AND c."zhText" IS NOT NULL
       ORDER BY random() LIMIT ${st.quota * 2}`;
    let taken = 0;
    for (const r of rows) {
      if (taken >= st.quota) break;
      if (seen.has(r.episodeid)) continue; // 同集只取 1 句——音源分散，听感不疲劳
      seen.add(r.episodeid);
      taken++;
      picked.push({
        clipid: r.clipid,
        episodeid: r.episodeid,
        startTime: r.startTime,
        endTime: r.endTime,
        enText: r.enText,
        zhText: r.zhText,
        sourceKey: r.audioFileName,
        sourceUrl: r.audioUrl,
        stratum: st.s,
      });
    }
    console.log(`${st.s}: 取 ${taken}/${st.quota}`);
  }

  const outDir = path.join(process.cwd(), ".local", "eval", "boundary-200");
  fs.mkdirSync(outDir, { recursive: true });
  const sheetRows: string[] = [
    "item,版本,文件,分层,enText,zhText,句首吞音(是/否),句尾截尾(是/否),闯入下句人声(是/否),备注",
  ];
  const key: Record<string, { A: string; B: string }> = {};
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  let done = 0;

  for (let i = 0; i < picked.length; i++) {
    const c = picked[i];
    const item = `q${String(i + 1).padStart(3, "0")}`;
    try {
      const src = c.sourceKey
        ? (await generateSignatureUrl(c.sourceKey, 3600)) || c.sourceUrl
        : c.sourceUrl;
      if (!src) throw new Error("no source url");
      // 盲测随机：A/B 与 cur/alt 的映射逐句掷硬币
      const aIsCur = Math.random() < 0.5;
      key[item] = { A: aIsCur ? "cur" : "alt", B: aIsCur ? "alt" : "cur" };
      for (const ver of ["A", "B"] as const) {
        const pad = PADS[key[item][ver] as "cur" | "alt"];
        const sliceStart = Math.max(0, c.startTime - pad[0]);
        const total = c.endTime + pad[1] - sliceStart;
        const out = path.join(outDir, `${item}${ver}.mp3`);
        await runFfmpeg([
          "-hide_banner",
          "-loglevel",
          "error",
          "-ss",
          sliceStart.toFixed(3),
          "-t",
          total.toFixed(3),
          "-i",
          src,
          "-af",
          `afade=t=in:st=0:d=0.15,afade=t=out:st=${Math.max(0, total - 0.15).toFixed(3)}:d=0.15`,
          "-ac",
          "1",
          "-ar",
          "24000",
          "-b:a",
          "64k",
          "-f",
          "mp3",
          "-y",
          out,
        ]);
        sheetRows.push(
          [
            item,
            ver,
            `${item}${ver}.mp3`,
            c.stratum,
            esc(c.enText),
            esc(c.zhText),
            "",
            "",
            "",
            "",
          ].join(","),
        );
      }
      done++;
      if (done % 20 === 0) console.log(`  已切 ${done}/${picked.length}`);
    } catch (e) {
      console.warn(
        `  ⚠ ${item} ${c.clipid} 切片失败跳过: ${(e as Error).message?.slice(0, 80)}`,
      );
      delete key[item];
    }
  }

  fs.writeFileSync(
    path.join(outDir, "sheet.csv"),
    "\uFEFF" + sheetRows.join("\n"),
    "utf8",
  );
  fs.writeFileSync(
    path.join(outDir, "key.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note: "标注完成前禁止查看——A/B 与 cur(-250/+350)/alt(-150/+250) 的映射",
        map: key,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(
    `完成：${done} 对双版切片 + sheet.csv（${sheetRows.length - 1} 行）+ key.json → .local/eval/boundary-200/`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
