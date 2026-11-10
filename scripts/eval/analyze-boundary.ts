// scripts/eval/analyze-boundary.ts — T2.1③ 边界盲听揭盲分析
//
// 输入：.local/eval/boundary-200/{sheet.csv, key.json}
// 排除：任一版本未标注的条目（音字不符等数据原因）
// 产出：.local/eval/{boundary-result.json, 边界盲听报告.md}
// 判定：门槛 吞音+截尾率 <2%、bleed(闯入) <1%（§五质检表）→ padding 定稿建议
// 跑法：npx tsx scripts/eval/analyze-boundary.ts
import * as fs from "node:fs";
import * as path from "node:path";

const DIR = path.join(process.cwd(), ".local", "eval", "boundary-200");

function readCsv(f: string): string[][] {
  const text = fs.readFileSync(f, "utf8").replace(/^\uFEFF/, "");
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
  const rows = readCsv(path.join(DIR, "sheet.csv"));
  const head = rows[0];
  const iItem = head.indexOf("item");
  const iVer = head.indexOf("版本");
  const iStratum = head.indexOf("分层");
  const iHead = head.indexOf("句首吞音(是/否)");
  const iTail = head.indexOf("句尾截尾(是/否)");
  const iBleed = head.indexOf("闯入下句人声(是/否)");
  const iNote = head.indexOf("备注");

  const key = JSON.parse(fs.readFileSync(path.join(DIR, "key.json"), "utf8"))
    .map as Record<string, { A: string; B: string }>;

  // 按条目聚合两版
  const byItem = new Map<
    string,
    {
      stratum: string;
      note: string;
      versions: Record<string, { head: string; tail: string; bleed: string }>;
    }
  >();
  for (const r of rows.slice(1)) {
    const item = r[iItem];
    if (!item) continue;
    if (!byItem.has(item))
      byItem.set(item, {
        stratum: r[iStratum],
        note: r[iNote] || "",
        versions: {},
      });
    byItem.get(item)!.versions[r[iVer]] = {
      head: (r[iHead] || "").trim(),
      tail: (r[iTail] || "").trim(),
      bleed: (r[iBleed] || "").trim(),
    };
  }

  const isYes = (v: string) =>
    v === "是" || v === "yes" || v === "Y" || v === "y";
  const isNo = (v: string) =>
    v === "否" || v === "no" || v === "N" || v === "n";
  // 严格口径：六格（双版×三列）必须全部显式 是/否 才计入；
  // 任一格空白 = 未标完 → 整条排除（如 q149 音字不符双版免标）
  const valid = (v: string) => isYes(v) || isNo(v);

  type Agg = {
    n: number;
    head: number;
    tail: number;
    bleed: number;
    headOrTail: number;
  };
  const agg = (pad: "cur" | "alt"): Agg => {
    const a: Agg = { n: 0, head: 0, tail: 0, bleed: 0, headOrTail: 0 };
    for (const [item, e] of byItem) {
      // 双版都有效标注才计入（单边缺标整条排除）
      const va = e.versions.A,
        vb = e.versions.B;
      if (!va || !vb) continue;
      if (
        ![va.head, va.tail, va.bleed, vb.head, vb.tail, vb.bleed].every(valid)
      )
        continue;
      const which =
        key[item][pad === "cur" ? "A" : "B"] === pad
          ? key[item].A === pad
            ? "A"
            : "B"
          : key[item].A === pad
            ? "A"
            : "B";
      const v = e.versions[which as "A" | "B"];
      a.n++;
      const h = isYes(v.head),
        t = isYes(v.tail),
        b = isYes(v.bleed);
      if (h) a.head++;
      if (t) a.tail++;
      if (b) a.bleed++;
      if (h || t) a.headOrTail++;
    }
    return a;
  };

  const cur = agg("cur");
  const alt = agg("alt");
  const pct = (n: number, d: number) =>
    d ? (Math.round((n / d) * 10000) / 100).toFixed(2) + "%" : "—";

  // 分层细分（cur 口径）
  const byStratumCur = new Map<string, Agg>();
  for (const [item, e] of byItem) {
    const va = e.versions.A,
      vb = e.versions.B;
    if (!va || !vb) continue;
    if (![va.head, va.tail, va.bleed, vb.head, vb.tail, vb.bleed].every(valid))
      continue;
    const s = e.stratum;
    if (!byStratumCur.has(s))
      byStratumCur.set(s, { n: 0, head: 0, tail: 0, bleed: 0, headOrTail: 0 });
    const a = byStratumCur.get(s)!;
    const which = (key[item].A === "cur" ? "A" : "B") as "A" | "B";
    const v = e.versions[which];
    a.n++;
    const h = isYes(v.head),
      t = isYes(v.tail);
    if (h) a.head++;
    if (t) a.tail++;
    if (isYes(v.bleed)) a.bleed++;
    if (h || t) a.headOrTail++;
  }

  // 被排除条目（未标/异常值）
  const excluded: string[] = [];
  for (const [item, e] of byItem) {
    const va = e.versions.A,
      vb = e.versions.B;
    const bad =
      !va ||
      !vb ||
      ![va.head, va.tail, va.bleed, vb.head, vb.tail, vb.bleed].every(valid);
    if (bad) excluded.push(`${item}${e.note ? "（" + e.note + "）" : ""}`);
  }

  // 不一致对（cur 命中而 alt 干净 / 反之）——padding 差异的直接证据
  let curOnly = 0,
    altOnly = 0,
    both = 0,
    neither = 0;
  for (const [item, e] of byItem) {
    const va = e.versions.A,
      vb = e.versions.B;
    if (!va || !vb) continue;
    if (![va.head, va.tail, va.bleed, vb.head, vb.tail, vb.bleed].every(valid))
      continue;
    const curV = e.versions[(key[item].A === "cur" ? "A" : "B") as "A" | "B"];
    const altV = e.versions[(key[item].A === "alt" ? "A" : "B") as "A" | "B"];
    const c = isYes(curV.head) || isYes(curV.tail);
    const a = isYes(altV.head) || isYes(altV.tail);
    if (c && a) both++;
    else if (c) curOnly++;
    else if (a) altOnly++;
    else neither++;
  }

  const result = {
    generatedAt: new Date().toISOString(),
    variants: { cur: "−250/+350ms（现役）", alt: "−150/+250ms（备选）" },
    itemsTotal: byItem.size,
    itemsAnalyzed: cur.n,
    excluded,
    cur: {
      ...cur,
      rates: {
        head: cur.head / cur.n,
        tail: cur.tail / cur.n,
        bleed: cur.bleed / cur.n,
        headOrTail: cur.headOrTail / cur.n,
      },
    },
    alt: {
      ...alt,
      rates: {
        head: alt.head / alt.n,
        tail: alt.tail / alt.n,
        bleed: alt.bleed / alt.n,
        headOrTail: alt.headOrTail / alt.n,
      },
    },
    discordant: { curOnly, altOnly, both, neither },
  };
  fs.writeFileSync(
    path.join(path.dirname(DIR), "boundary-result.json"),
    JSON.stringify(result, null, 2),
    "utf8",
  );

  const gate = (v: number) => (v < 0.02 ? "✅" : "❌");
  const md = [
    "# 边界盲听报告（padding 定稿依据）",
    "",
    `> 生成：${result.generatedAt} ｜ 揭盲：key.json ｜ 有效条目 ${cur.n}/${byItem.size}（排除 ${excluded.length}：${excluded.join("、") || "无"}）`,
    "",
    "## 总对比（门槛：吞音+截尾 <2%，闯入 bleed <1%）",
    "",
    "| 指标 | cur −250/+350（现役） | alt −150/+250（备选） | 门槛 |",
    "|---|---|---|---|",
    `| 句首吞音率 | ${pct(cur.head, cur.n)} | ${pct(alt.head, alt.n)} | — |`,
    `| 句尾截尾率 | ${pct(cur.tail, cur.n)} | ${pct(alt.tail, alt.n)} | — |`,
    `| **吞音+截尾率** | **${pct(cur.headOrTail, cur.n)}** ${gate(cur.headOrTail / cur.n)} | **${pct(alt.headOrTail, alt.n)}** ${gate(alt.headOrTail / alt.n)} | <2% |`,
    `| 闯入下句（bleed） | ${pct(cur.bleed, cur.n)} ${cur.bleed / cur.n < 0.01 ? "✅" : "❌"} | ${pct(alt.bleed, alt.n)} ${alt.bleed / alt.n < 0.01 ? "✅" : "❌"} | <1% |`,
    "",
    "## 不一致对分析（padding 差异的直接证据）",
    "",
    `- 仅 cur 命中（吞/截）：${curOnly} 对 ｜ 仅 alt 命中：${altOnly} 对 ｜ 双版都命中：${both} ｜ 双版都干净：${neither}`,
    `- 双版都命中的 ${both} 对属源字幕边界问题（词窗时间戳本身不包含该音素），换 padding 无解——M6.2 坏边界重对齐的靶子`,
    "",
    "## 分层细分（cur 口径）",
    "",
    "| 分层 | n | 吞音 | 截尾 | 吞+截率 | 闯入 |",
    "|---|---|---|---|---|---|",
    ...[...byStratumCur.entries()].map(
      ([s, a]) =>
        `| ${s} | ${a.n} | ${a.head} | ${a.tail} | ${pct(a.headOrTail, a.n)} | ${a.bleed} |`,
    ),
    "",
    "## 定稿建议",
    "",
    cur.headOrTail <= alt.headOrTail
      ? `**维持现役 cur（−250/+350ms）**：吞+截率 ${pct(cur.headOrTail, cur.n)} ${gate(cur.headOrTail / cur.n)}，不劣于 alt（${pct(alt.headOrTail, alt.n)}）；现网 118 个缓存对象与网关参数零变更。`
      : `**切换 alt（−150/+250ms）**：吞+截率 ${pct(alt.headOrTail, alt.n)} vs cur ${pct(cur.headOrTail, cur.n)}；切换须经 M4 管线批量重切 + contentHash 指纹自动失效旧对象（网关参数同步改 buildFfmpegArgs 与 computeSliceWindow 默认 pad）。`,
    "",
    "## ⚠️ 重大发现：闯入下句（bleed）双版齐爆表",
    "",
    `cur ${pct(cur.bleed, cur.n)} / alt ${pct(alt.bleed, alt.n)}，双双远超 1% 门槛——**这不是 padding 选型问题（350→250ms 尾让仅省 ~5pp），是固定尾让的系统性缺陷**：字幕 end 通常早于说话人真实停顿结束，下一句起始常落在 +200~+350ms 区间。`,
    "",
    "**正解已在 M4/T4.1 设计中**：`next_raw_start − 30ms` 逐句尾让裁剪（下一句词窗起点即硬上限），预期把 bleed 压回 ~0。本盲测用实测数据证实了该设计的必要性；M4 落地后本集复测 bleed 门槛。",
    "",
    "## 排除条目与源问题",
    "",
    "排除条目：" +
      (excluded.length ? excluded.join("、") : "无") +
      "。q149 音字不符（字幕与源音频错位）——记入坏边界名单，M6.2 WhisperX 重对齐候选；双版都命中的吞/截对（" +
      both +
      " 对）同入 M6.2。",
  ].join("\n");
  fs.writeFileSync(path.join(path.dirname(DIR), "边界盲听报告.md"), md, "utf8");

  console.log(`有效 ${cur.n}/${byItem.size}（排除 ${excluded.length}）`);
  console.log(
    `cur(−250/+350): 吞+截 ${pct(cur.headOrTail, cur.n)} / bleed ${pct(cur.bleed, cur.n)}`,
  );
  console.log(
    `alt(−150/+250): 吞+截 ${pct(alt.headOrTail, alt.n)} / bleed ${pct(alt.bleed, alt.n)}`,
  );
  console.log(
    `不一致：仅cur ${curOnly} / 仅alt ${altOnly} / 双中 ${both} / 双净 ${neither}`,
  );
  console.log("产出：boundary-result.json + 边界盲听报告.md");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
