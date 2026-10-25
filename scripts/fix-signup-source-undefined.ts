/**
 * signupSource 脏值清洗（一次性）：
 *   npx tsx scripts/fix-signup-source-undefined.ts
 *
 * 背景：NextAuth signIn 的 URLSearchParams 会把 undefined 序列化成字面量
 * "undefined" 传入后端，旧版 normalizeSignupSource 只校验字符集放行了它，
 * User.signupSource 落库为 "undefined"（转化分析页来源列显示 undefined）。
 * 处置：受影响行先备份到 scripts/tmp-signupsource-backup-<date>.json，
 * 再统一置 NULL（归入"未标注"组）。
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

const BACKUP = `scripts/tmp-signupsource-backup-${new Date()
  .toISOString()
  .slice(0, 10)
  .replace(/-/g, "")}.json`;

async function main() {
  const dirty = await prisma.$queryRaw<
    {
      userid: string;
      phone: string | null;
      email: string;
      signupSource: string;
      createAt: Date;
    }[]
  >`
    SELECT "userid", "phone", "email", "signupSource", "createAt"
    FROM "User"
    WHERE "signupSource" IN ('undefined', 'null', 'NaN')
  `;

  if (dirty.length === 0) {
    console.log("无脏值，无需清洗。");
    await prisma.$disconnect();
    return;
  }

  fs.writeFileSync(
    BACKUP,
    JSON.stringify(
      dirty.map((d) => ({
        ...d,
        createAt: d.createAt.toISOString(),
      })),
      null,
      2,
    ),
  );
  console.log(`备份 ${dirty.length} 行到 ${BACKUP}：`);
  for (const d of dirty)
    console.log(`  ${d.userid} ${d.email} "${d.signupSource}"`);

  const res = await prisma.$executeRaw`
    UPDATE "User"
    SET "signupSource" = NULL
    WHERE "signupSource" IN ('undefined', 'null', 'NaN')
  `;
  console.log(`已将 ${res} 行 signupSource 置 NULL。`);

  const remain = await prisma.$queryRaw<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt FROM "User"
    WHERE "signupSource" IN ('undefined', 'null', 'NaN')
  `;
  console.log(`校验：剩余脏值 ${remain[0].cnt} 行（应为 0）。`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
