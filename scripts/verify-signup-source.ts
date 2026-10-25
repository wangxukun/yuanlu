/**
 * signupSource 脏值只读排查：
 *   npx tsx scripts/verify-signup-source.ts
 *
 * 背景：转化分析页出现来源显示 "undefined"，怀疑某客户端把缺失值
 * 字符串化后提交（正则只校验字符集，全字母的 "undefined" 可入库）。
 * 只读，不改数据。
 */
import * as fs from "node:fs";

for (const line of fs
  .readFileSync(`${process.cwd()}/.env`, "utf-8")
  .split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

import prisma from "@/lib/prisma";

const JUNK = new Set(["undefined", "null", "NaN", ""]);

async function main() {
  const rows = await prisma.$queryRaw<
    {
      source: string | null;
      cnt: number;
      first_seen: Date;
      last_seen: Date;
      sample_phones: string[];
    }[]
  >`
    SELECT "signupSource" AS source,
           COUNT(*)::int AS cnt,
           MIN("createAt") AS first_seen,
           MAX("createAt") AS last_seen,
           ARRAY_AGG(LEFT("email", 20) ORDER BY "createAt") AS sample_phones
    FROM "User"
    GROUP BY 1
    ORDER BY cnt DESC
  `;

  console.log("全量 signupSource 分布：");
  for (const r of rows) {
    const flag = r.source !== null && JUNK.has(r.source) ? "  <-- 脏值" : "";
    console.log(
      `  ${r.source === null ? "(NULL)" : `"${r.source}"`}: ${rCnt(r.cnt)} 条` +
        `  ${r.first_seen?.toISOString().slice(0, 10)}~${r.last_seen?.toISOString().slice(0, 10)}` +
        flag,
    );
  }

  // 脏值样本明细：注册 IP / 邮箱形态可判断来自哪个客户端通道
  const junk = rows.filter(
    (r) => r.source !== null && JUNK.has(r.source) && r.source !== "",
  );
  for (const j of junk) {
    const detail = await prisma.$queryRaw<
      {
        userid: string;
        email: string;
        createAt: Date;
        registerIp: string | null;
      }[]
    >`
      SELECT "userid", "email", "createAt", "registerIp"
      FROM "User"
      WHERE "signupSource" = ${j.source}
      ORDER BY "createAt"
    `;
    console.log(`\n脏值 "${j.source}" 明细：`);
    for (const d of detail) {
      console.log(
        `  ${d.userid} ${d.email} ${d.createAt.toISOString()} ip=${d.registerIp ?? "-"}`,
      );
    }
  }
  await prisma.$disconnect();
}

function rCnt(n: number) {
  return n;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
