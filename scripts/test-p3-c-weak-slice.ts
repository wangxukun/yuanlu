/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * [P3-c] 弱项本试用切片收编 service 自测（一次性脚本，测后清理）
 *
 * 覆盖：
 *  1. 非会员切片：弱项 >3 条时返回前 FREE_VISIBLE_ERRORS 条，
 *     totalErrors 为全量数、isTrialMode=true
 *  2. 切片顺序：按弱项"最新在前"截取（最近活跃的优先可见）
 *  3. 会员全量：isPremium=true 返回全部，isTrialMode=false
 *  4. isPremium 缺省（向后兼容）：等同全量，不切片
 *  5. 新手边界：弱项 ≤3 条时非会员也全量可见，isTrialMode=false
 *  6. 空弱项本：records=[] + totalErrors=0 + isTrialMode=false
 *  7. dismiss 联动：切片在 Step D 过滤后执行——前 3 条中被攻克后自动补位
 *  8. 阈值口径回归：threshold 显式传入仍生效（P2-4 语义保留）
 *
 * 运行：npx tsx scripts/test-p3-c-weak-slice.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  getWeakSentences,
  dismissWeakSentence,
} from "../core/speech/weak-sentences.service";
import { FREE_VISIBLE_ERRORS } from "../lib/quota";

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

async function main() {
  const uid = `test_p3c_${Date.now()}`;
  const uid2 = `test_p3c2_${Date.now()}`;
  try {
    await prisma.user.create({
      data: {
        userid: uid,
        email: `${uid}@test.local`,
        role: "USER",
        user_profile: { create: { weakScoreThreshold: 60 } },
      },
    });

    // ── 造 5 条弱项（recognitionDate 递减：W1 最新 … W5 最旧） ──
    for (let i = 1; i <= 5; i++) {
      await prisma.speech_recognition.create({
        data: {
          userid: uid,
          targetText: `W${i}`,
          overallScore: 50,
          targetStartTime: i,
          recognitionDate: new Date(Date.now() - i * 60_000),
        },
      });
    }

    // ── 1&2: 非会员切片 + 顺序 ───────────────────────────────────
    console.log("\n[1] 非会员试用切片");
    const r1 = await getWeakSentences(uid, { isPremium: false, threshold: 60 });
    const t1 = r1.records.map((r: any) => r.targetText);
    assert(
      r1.records.length === FREE_VISIBLE_ERRORS,
      `切片长度 = FREE_VISIBLE_ERRORS（${FREE_VISIBLE_ERRORS}）`,
      `实际 ${r1.records.length}`,
    );
    assert(
      t1.join(",") === "W1,W2,W3",
      "切片按最新在前截取（W1/W2/W3 可见）",
      `实际 [${t1}]`,
    );
    assert(r1.totalErrors === 5, "totalErrors 回传全量数 5");
    assert(r1.isTrialMode === true, "存在被锁定弱项 → isTrialMode=true");
    assert(r1.threshold === 60, "显式传入 threshold 仍生效（P2-4 回归）");

    // ── 3&4: 会员全量 / 缺省兼容 ─────────────────────────────────
    console.log("\n[2] 会员全量与缺省兼容");
    const r2 = await getWeakSentences(uid, { isPremium: true, threshold: 60 });
    assert(
      r2.records.length === 5 && r2.totalErrors === 5,
      "isPremium=true 返回全量 5 条",
    );
    assert(r2.isTrialMode === false, "会员 isTrialMode=false");
    const r3 = await getWeakSentences(uid, { threshold: 60 });
    assert(
      r3.records.length === 5,
      "isPremium 缺省 = 全量（三处既有调用方向后兼容）",
    );

    // ── 7: dismiss 联动补位 ──────────────────────────────────────
    console.log("\n[3] 切片在已攻克过滤后执行（补位）");
    await dismissWeakSentence(uid, "W2");
    const r4 = await getWeakSentences(uid, { isPremium: false, threshold: 60 });
    const t4 = r4.records.map((r: any) => r.targetText);
    assert(
      t4.join(",") === "W1,W3,W4",
      "前 3 条中 W2 被攻克后，切片自动补位 W1/W3/W4",
      `实际 [${t4}]`,
    );
    assert(
      r4.totalErrors === 4 && r4.isTrialMode === true,
      "全量口径联动：totalErrors=4 仍处试用模式",
    );

    // ── 5&6: 新手边界 ────────────────────────────────────────────
    console.log("\n[4] 新手边界");
    await prisma.user.create({
      data: {
        userid: uid2,
        email: `${uid2}@test.local`,
        role: "USER",
        user_profile: { create: {} },
      },
    });
    for (let i = 1; i <= 2; i++) {
      await prisma.speech_recognition.create({
        data: {
          userid: uid2,
          targetText: `N${i}`,
          overallScore: 40,
          targetStartTime: i,
        },
      });
    }
    const r5 = await getWeakSentences(uid2, { isPremium: false });
    assert(
      r5.records.length === 2 && r5.totalErrors === 2,
      "弱项 ≤3 条时非会员全量可见（配额自然未生效的新手边界）",
    );
    assert(r5.isTrialMode === false, "无锁定层 → isTrialMode=false");
    const r6 = await getWeakSentences(`${uid2}_none`, { isPremium: false });
    assert(
      r6.records.length === 0 &&
        r6.totalErrors === 0 &&
        r6.isTrialMode === false,
      "空弱项本：空切片 + totalErrors=0 + isTrialMode=false",
    );

    console.log(
      `\n========== 结果：${passed} 通过 / ${failed} 失败 ==========`,
    );
  } finally {
    await prisma.speech_recognition.deleteMany({
      where: { userid: { in: [uid, uid2] } },
    });
    await prisma.dismissed_pronunciation.deleteMany({
      where: { userid: uid },
    });
    await prisma.user.deleteMany({
      where: { userid: { in: [uid, uid2] } },
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
