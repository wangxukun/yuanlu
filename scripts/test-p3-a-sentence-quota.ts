/**
 * [P3-a] 句子收藏配额 service 自测（一次性脚本，测后清理）
 *
 * 覆盖：
 *  1. 免费用户正常收藏（saved + totalCount 回传）
 *  2. 第 31 条触墙（quotaExceeded，totalCount=30=limit）
 *  3. 取消收藏永不拦截（满 30 时删除成功）
 *  4. 腾位后可再收藏
 *  5. 有效订阅会员不受限（第 31 条正常保存）
 *  6. ADMIN 直通不受限
 *  7. 【M1 关键】并发新增：29 条时两个并发 toggle 不同句子 → 咨询锁保证最终 ≤30
 *
 * 运行：npx tsx scripts/test-p3-a-sentence-quota.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { sentencesService } from "../core/sentences/sentences.service";
import { FREE_SENTENCE_LIMIT } from "../lib/quota";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.error(`  ❌ ${name}${detail ? ` —— ${detail}` : ""}`);
  }
}

async function mkUser(
  email: string,
  opts: { premium?: boolean; admin?: boolean } = {},
) {
  const hash = await bcrypt.hash("x", 4);
  return prisma.user.create({
    data: {
      email,
      password: hash,
      role: opts.admin ? "ADMIN" : "USER",
      ...(opts.premium
        ? {
            subscriptions: {
              create: [
                {
                  subscriptionType: "PREMIUM",
                  startDate: new Date(),
                  endDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
                },
              ],
            },
          }
        : {}),
    },
  });
}

function sentInput(i: number, episodeid: string) {
  return {
    episodeid,
    subtitleId: i,
    startTime: i * 10,
    endTime: i * 10 + 5,
    enText: `Sentence #${i}`,
    zhText: `第 ${i} 句`,
  };
}

async function main() {
  const prefix = `p3a_${Date.now()}`;
  // SavedSentence.episodeid 有 FK 约束，需真实剧集行
  const episode = await prisma.episode.create({
    data: { title: `${prefix} 测试剧集`, audioUrl: "test://audio" },
  });
  const EP = episode.episodeid;
  const free = await mkUser(`${prefix}_free@test.local`);
  const pro = await mkUser(`${prefix}_pro@test.local`, { premium: true });
  const admin = await mkUser(`${prefix}_admin@test.local`, { admin: true });

  try {
    // ── 1. 免费用户正常收藏 ──────────────────────────────────────
    console.log("\n[1] 免费用户正常收藏");
    const r1 = await sentencesService.toggleSave(free.userid, sentInput(1, EP));
    assert(
      r1.saved && r1.totalCount === 1,
      "首条收藏成功，totalCount=1",
      JSON.stringify(r1),
    );

    // 灌满到 30
    for (let i = 2; i <= FREE_SENTENCE_LIMIT; i++) {
      await sentencesService.toggleSave(free.userid, sentInput(i, EP));
    }
    const countFree = await prisma.savedSentence.count({
      where: { userid: free.userid },
    });
    assert(
      countFree === FREE_SENTENCE_LIMIT,
      `灌满 30 条（实际 ${countFree}）`,
    );

    // ── 2. 第 31 条触墙 ─────────────────────────────────────────
    console.log("\n[2] 第 31 条触墙");
    const r2 = await sentencesService.toggleSave(
      free.userid,
      sentInput(999, EP),
    );
    assert(
      !r2.saved &&
        r2.quotaExceeded === true &&
        r2.totalCount === 30 &&
        r2.limit === 30,
      "quotaExceeded + totalCount/limit 回传",
      JSON.stringify(r2),
    );
    const countAfterBlock = await prisma.savedSentence.count({
      where: { userid: free.userid },
    });
    assert(countAfterBlock === 30, "触墙不落库（仍 30 条）");

    // ── 3. 取消收藏永不拦截 ─────────────────────────────────────
    console.log("\n[3] 满额时取消收藏不受限");
    const r3 = await sentencesService.toggleSave(
      free.userid,
      sentInput(30, EP),
    );
    assert(r3.saved === false && !r3.quotaExceeded, "第 30 条删除成功");

    // ── 4. 腾位后可再收藏 ───────────────────────────────────────
    console.log("\n[4] 腾位后可再收藏");
    const r4 = await sentencesService.toggleSave(
      free.userid,
      sentInput(999, EP),
    );
    assert(r4.saved === true, "删除 1 条后新句可收藏");

    // ── 5. 会员不受限 ───────────────────────────────────────────
    console.log("\n[5] 有效订阅会员不受限");
    for (let i = 1; i <= FREE_SENTENCE_LIMIT + 1; i++) {
      await sentencesService.toggleSave(pro.userid, sentInput(i, EP));
    }
    const countPro = await prisma.savedSentence.count({
      where: { userid: pro.userid },
    });
    assert(
      countPro === FREE_SENTENCE_LIMIT + 1,
      `会员第 31 条正常收藏（实际 ${countPro}）`,
    );

    // ── 6. ADMIN 直通 ───────────────────────────────────────────
    console.log("\n[6] ADMIN 直通不受限");
    const r6a = await sentencesService.toggleSave(
      admin.userid,
      sentInput(1, EP),
    );
    const r6b = await sentencesService.toggleSave(
      admin.userid,
      sentInput(2, EP),
    );
    assert(
      r6a.saved === true && r6b.saved === true,
      "ADMIN 无订阅也连续收藏成功（totalCount 不计数）",
    );

    // ── 7. M1 并发：29 条时两并发新增 ───────────────────────────
    console.log("\n[7] M1 并发防护（咨询锁）");
    // 先腾到 29
    await sentencesService.toggleSave(free.userid, sentInput(999, EP)); // 删除（已存在）
    const cNow = await prisma.savedSentence.count({
      where: { userid: free.userid },
    });
    assert(cNow === 29, `并发前基线 29 条（实际 ${cNow}）`);
    const [ra, rb] = await Promise.all([
      sentencesService.toggleSave(free.userid, { ...sentInput(1000, EP) }),
      sentencesService.toggleSave(free.userid, { ...sentInput(1001, EP) }),
    ]);
    const cAfter = await prisma.savedSentence.count({
      where: { userid: free.userid },
    });
    const blocked = [ra, rb].filter((r) => r.quotaExceeded).length;
    assert(
      cAfter === FREE_SENTENCE_LIMIT,
      `两并发不同句最终恰好 30 条（实际 ${cAfter}），被拦 ${blocked} 个`,
      JSON.stringify({ ra, rb, cAfter }),
    );

    console.log(
      `\n========== 结果：${passed} 通过 / ${failed} 失败 ==========`,
    );
  } finally {
    await prisma.savedSentence.deleteMany({
      where: { userid: { in: [free.userid, pro.userid, admin.userid] } },
    });
    await prisma.episode.deleteMany({ where: { episodeid: EP } });
    await prisma.conversion_events.deleteMany({
      where: { userid: { in: [free.userid, pro.userid, admin.userid] } },
    });
    await prisma.user.deleteMany({
      where: { userid: { in: [free.userid, pro.userid, admin.userid] } },
    });
    console.log("[cleanup] 测试数据已清理");
    await prisma.$disconnect();
  }
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("测试脚本异常:", e);
  process.exit(1);
});
