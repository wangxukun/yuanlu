/**
 * [P3-b] 评测双池拆分 service 自测（一次性脚本，测后清理）
 *
 * 覆盖：
 *  1. learn 月池只计 scenario="learn" 行：19 条 learn 本月 + 6 条 review 今日
 *     → learn 仍放行（若误计 review 行为 25 条则触墙）
 *  2. learn 触墙：补 1 条 learn（共 20）→ code=EVALUATION_QUOTA_EXCEEDED；
 *     同用户 review 日池仍放行（双池独立互不挤占）
 *  3. review 日池 5+1 buffer：当日 5 条 review → 放行（used=5 < 5+1）；
 *     第 6 条后 → code=REVIEW_EVAL_QUOTA_EXCEEDED；文案按承诺口径 5 次
 *  4. 昨日 review 行不计入今日日池（自然日重置语义）
 *  5. 会员直通：learn / review 均不拦
 *  6. saveSpeechResultCore 落库携带 scenario（review 显式 / 缺省 learn）
 *  7. getEvaluationQuotaStatus 字段口径：limit=承诺额度（不含 buffer）、
 *     remaining=实际可评（review 含 buffer）、exhausted、会员 remaining=null
 *
 * 运行：npx tsx scripts/test-p3-b-eval-dual-pool.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  checkEvaluationQuota,
  getEvaluationQuotaStatus,
  saveSpeechResultCore,
} from "../core/speech/speech-evaluate.service";
import {
  FREE_SPEECH_EVALUATIONS_PER_MONTH,
  FREE_REVIEW_EVALUATIONS_PER_DAY,
  REVIEW_EVAL_DAILY_BUFFER,
  SPEECH_QUOTA_EXCEEDED,
  REVIEW_EVAL_QUOTA_EXCEEDED,
} from "../lib/quota";

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

async function mkUser(email: string, opts: { premium?: boolean } = {}) {
  const hash = await bcrypt.hash("x", 4);
  return prisma.user.create({
    data: {
      email,
      password: hash,
      role: "USER",
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

/** 造一条评测流水（recognitionDate 可回拨，模拟昨日/本月内） */
function mkEval(
  userid: string,
  scenario: "learn" | "review",
  recognitionDate: Date,
) {
  return prisma.speech_recognition.create({
    data: {
      userid,
      targetText: `P3b ${scenario}`,
      overallScore: 70,
      targetStartTime: 0,
      recognitionDate,
      scenario,
    },
  });
}

async function main() {
  const stamp = Date.now();
  const freeUser = await mkUser(`test_p3b_free_${stamp}@test.local`);
  const premUser = await mkUser(`test_p3b_prem_${stamp}@test.local`, {
    premium: true,
  });
  const uid = freeUser.userid;

  const yesterday = new Date(Date.now() - 24 * 3600 * 1000);

  try {
    // ── 1. 月池只计 learn 行 ─────────────────────────────────────
    console.log("\n[1] learn 月池计数不含 review 行");
    for (let i = 0; i < FREE_SPEECH_EVALUATIONS_PER_MONTH - 1; i++) {
      await mkEval(uid, "learn", new Date());
    }
    for (
      let i = 0;
      i < FREE_REVIEW_EVALUATIONS_PER_DAY + REVIEW_EVAL_DAILY_BUFFER;
      i++
    ) {
      await mkEval(uid, "review", new Date());
    }
    let block = await checkEvaluationQuota(
      { role: "USER", userid: uid },
      "learn",
    );
    assert(
      block === null,
      `19 条 learn + ${FREE_REVIEW_EVALUATIONS_PER_DAY + REVIEW_EVAL_DAILY_BUFFER} 条 review → learn 月池仍放行`,
    );

    // ── 2. learn 触墙 + 双池独立 ─────────────────────────────────
    console.log("\n[2] learn 月池触墙（第 20 条后）");
    await mkEval(uid, "learn", new Date()); // 满 20
    block = await checkEvaluationQuota({ role: "USER", userid: uid }, "learn");
    assert(
      block?.code === SPEECH_QUOTA_EXCEEDED,
      "learn 月池 20 条满 → EVALUATION_QUOTA_EXCEEDED",
      JSON.stringify(block),
    );
    assert(
      !!block?.message.includes(String(FREE_SPEECH_EVALUATIONS_PER_MONTH)),
      "learn 触墙文案含月池额度",
      block?.message,
    );
    block = await checkEvaluationQuota({ role: "USER", userid: uid }, "review");
    assert(
      block?.code === REVIEW_EVAL_QUOTA_EXCEEDED,
      "同用户 review 日池已满（6 条）→ REVIEW_EVAL_QUOTA_EXCEEDED（两池独立计数）",
      JSON.stringify(block),
    );

    // ── 3. review 日池 5+1 buffer ────────────────────────────────
    console.log("\n[3] review 日池 5+1 buffer 断崖缓冲");
    const uidB = (await mkUser(`test_p3b_buf_${stamp}@test.local`)).userid;
    for (let i = 0; i < FREE_REVIEW_EVALUATIONS_PER_DAY; i++) {
      await mkEval(uidB, "review", new Date());
    }
    block = await checkEvaluationQuota(
      { role: "USER", userid: uidB },
      "review",
    );
    assert(
      block === null,
      `当日 ${FREE_REVIEW_EVALUATIONS_PER_DAY} 条 review → 仍放行（5+1 buffer）`,
    );
    await mkEval(uidB, "review", new Date()); // 第 6 条（缓冲位）
    block = await checkEvaluationQuota(
      { role: "USER", userid: uidB },
      "review",
    );
    assert(
      block?.code === REVIEW_EVAL_QUOTA_EXCEEDED,
      "第 7 次尝试触墙（实际放行 6 次）",
      JSON.stringify(block),
    );
    assert(
      !!block?.message.includes(String(FREE_REVIEW_EVALUATIONS_PER_DAY)) &&
        !block.message.includes(String(FREE_REVIEW_EVALUATIONS_PER_DAY + 1)),
      "触墙文案按承诺口径 5 次（不泄露 buffer）",
      block?.message,
    );
    block = await checkEvaluationQuota({ role: "USER", userid: uidB }, "learn");
    assert(
      block === null,
      "review 挤满日池不影响 learn 月池（0 条 learn 放行）",
    );

    // ── 4. 昨日 review 不计入今日 ────────────────────────────────
    console.log("\n[4] 日池自然日重置语义");
    const uidC = (await mkUser(`test_p3b_day_${stamp}@test.local`)).userid;
    await mkEval(uidC, "review", yesterday); // 昨日 1 条
    const stC = await getEvaluationQuotaStatus(
      { role: "USER", userid: uidC },
      "review",
    );
    assert(stC.used === 0, "昨日 review 行不计入今日日池", JSON.stringify(stC));

    // ── 5. 会员直通 ──────────────────────────────────────────────
    console.log("\n[5] 有效订阅会员直通");
    const learnBlock = await checkEvaluationQuota(
      { role: "USER", userid: premUser.userid },
      "learn",
    );
    const reviewBlock = await checkEvaluationQuota(
      { role: "USER", userid: premUser.userid },
      "review",
    );
    assert(
      learnBlock === null && reviewBlock === null,
      "会员 learn/review 均不拦",
    );

    // ── 6. 保存落库携带 scenario ─────────────────────────────────
    console.log("\n[6] saveSpeechResultCore 场景落库");
    // episodeid 有外键约束，借用库中现有剧集
    const ep = await prisma.episode.findFirst({
      select: { episodeid: true },
      orderBy: { episodeid: "asc" },
    });
    const epId = ep?.episodeid ?? "test_p3b";
    const saveReview = await saveSpeechResultCore(uid, {
      episodeId: epId,
      targetText: "P3b review save",
      speechText: "p3b review save",
      accuracyScore: 72,
      targetStartTime: 0,
      scenario: "review",
    });
    assert(
      !!saveReview.success && saveReview.data?.scenario === "review",
      "显式 review 保存 → 落库 scenario=review",
      JSON.stringify({ err: saveReview.error, s: saveReview.data?.scenario }),
    );
    const saveLearn = await saveSpeechResultCore(uid, {
      episodeId: epId,
      targetText: "P3b learn save",
      speechText: "p3b learn save",
      accuracyScore: 71,
      targetStartTime: 0,
    });
    assert(
      !!saveLearn.success && saveLearn.data?.scenario === "learn",
      "缺省保存 → 落库 scenario=learn（DB 默认）",
      JSON.stringify({ err: saveLearn.error, s: saveLearn.data?.scenario }),
    );

    // ── 7. quota 状态查询字段口径 ────────────────────────────────
    console.log("\n[7] getEvaluationQuotaStatus 字段口径");
    const stLearnFull = await getEvaluationQuotaStatus(
      { role: "USER", userid: uid },
      "learn",
    );
    assert(
      stLearnFull.scenario === "learn" &&
        stLearnFull.limit === FREE_SPEECH_EVALUATIONS_PER_MONTH &&
        stLearnFull.used === FREE_SPEECH_EVALUATIONS_PER_MONTH + 1 && // 20 + 用例6 的缺省保存
        stLearnFull.remaining === 0 &&
        stLearnFull.exhausted === true,
      "learn 满 20 → remaining=0 / exhausted=true",
      JSON.stringify(stLearnFull),
    );
    const stBuf5 = await getEvaluationQuotaStatus(
      { role: "USER", userid: uidB },
      "review",
    );
    assert(
      stBuf5.limit === FREE_REVIEW_EVALUATIONS_PER_DAY &&
        stBuf5.used === FREE_REVIEW_EVALUATIONS_PER_DAY + 1 &&
        stBuf5.remaining === 0 &&
        stBuf5.exhausted === true,
      "review 用 6（5+buffer）→ remaining=0 / exhausted=true",
      JSON.stringify(stBuf5),
    );
    const uidD = (await mkUser(`test_p3b_rem_${stamp}@test.local`)).userid;
    for (let i = 0; i < FREE_REVIEW_EVALUATIONS_PER_DAY - 1; i++) {
      await mkEval(uidD, "review", new Date());
    }
    const stRem = await getEvaluationQuotaStatus(
      { role: "USER", userid: uidD },
      "review",
    );
    assert(
      stRem.remaining === 2,
      "review 用 4 → remaining=2（1 承诺位 + 1 buffer 位）",
      JSON.stringify(stRem),
    );
    const stPrem = await getEvaluationQuotaStatus(
      { role: "USER", userid: premUser.userid },
      "review",
    );
    assert(
      stPrem.isPremium === true &&
        stPrem.remaining === null &&
        stPrem.exhausted === false,
      "会员 → remaining=null / exhausted=false",
      JSON.stringify(stPrem),
    );
  } finally {
    // ── 清理（级联删订阅/评测流水；conversion_events 无 userid 关联不级联，按 userid 清）──
    const uids = [uid, premUser.userid].concat(
      await prisma.user
        .findMany({
          where: {
            email: { startsWith: "test_p3b_", contains: String(stamp) },
          },
          select: { userid: true },
        })
        .then((rows) => rows.map((r) => r.userid)),
    );
    await prisma.conversion_events.deleteMany({
      where: { userid: { in: uids } },
    });
    await prisma.user.deleteMany({
      where: { userid: { in: uids } },
    });
    console.log("\n🧹 测试数据已清理");
  }

  console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
  if (failed > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
