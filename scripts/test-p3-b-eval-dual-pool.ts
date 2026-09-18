/**
 * [全局日池] 评测配额 service 自测（一次性脚本，测后清理）
 *
 * 产品演进（原 P3-b 双池拆分的后续统一）：学新月池（20 次/月）废止，
 * learn / review 两种场景共用同一个"每日跟读配额"池（5+1 buffer/日），
 * 不论在哪个剧集、哪个练习入口。本脚本验证统一后的语义：
 *
 *  1. 跨场景统一计数：当日 3 learn + 2 review（共 5）→ 仍放行（5 < 5+1）；
 *     第 6 条（任意场景）后 learn / review 入口同码触墙
 *     （REVIEW_EVAL_QUOTA_EXCEEDED——统一错误码，前端弹同一场景窗）
 *  2. 5+1 buffer 断崖缓冲：对外承诺 5 次，实际放行 6 次；
 *     触墙文案按承诺口径 5 次（不泄露 buffer）
 *  3. 日池自然日重置：昨日行（learn/review 均有）不计入今日
 *  4. 会员直通：learn / review 均不拦；status remaining=null
 *  5. saveSpeechResultCore 落库携带 scenario（review 显式 / 缺省 learn）
 *     ——scenario 保留为画像维度，不参与配额分流
 *  6. getEvaluationQuotaStatus 字段口径：learn/review 入口同池同 limit（5）、
 *     used=当日跨场景总数、remaining 含 buffer、exhausted、会员 null
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
  FREE_REVIEW_EVALUATIONS_PER_DAY,
  REVIEW_EVAL_DAILY_BUFFER,
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

/** 造一条评测流水（recognitionDate 可回拨，模拟昨日） */
function mkEval(
  userid: string,
  scenario: "learn" | "review",
  recognitionDate: Date,
) {
  return prisma.speech_recognition.create({
    data: {
      userid,
      targetText: `Quota ${scenario}`,
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
    // ── 1. 跨场景统一计数 + 同码触墙 ─────────────────────────────
    console.log("\n[1] 全局日池跨场景统一计数");
    for (let i = 0; i < 3; i++) await mkEval(uid, "learn", new Date());
    for (let i = 0; i < 2; i++) await mkEval(uid, "review", new Date());
    let block = await checkEvaluationQuota(
      { role: "USER", userid: uid },
      "learn",
    );
    assert(
      block === null,
      `当日 3 learn + 2 review（共 ${FREE_REVIEW_EVALUATIONS_PER_DAY}）→ learn 入口仍放行（5+1 buffer）`,
    );
    block = await checkEvaluationQuota({ role: "USER", userid: uid }, "review");
    assert(block === null, "review 入口同池放行（两入口查的是同一个池）");

    await mkEval(uid, "learn", new Date()); // 第 6 条（缓冲位，learn 场景）
    const blockLearn = await checkEvaluationQuota(
      { role: "USER", userid: uid },
      "learn",
    );
    const blockReview = await checkEvaluationQuota(
      { role: "USER", userid: uid },
      "review",
    );
    assert(
      blockLearn?.code === REVIEW_EVAL_QUOTA_EXCEEDED &&
        blockReview?.code === REVIEW_EVAL_QUOTA_EXCEEDED,
      "第 6 条后 learn / review 入口同码触墙（统一错误码）",
      JSON.stringify({ blockLearn, blockReview }),
    );
    assert(
      !!blockLearn?.message.includes(String(FREE_REVIEW_EVALUATIONS_PER_DAY)) &&
        !blockLearn.message.includes(
          String(FREE_REVIEW_EVALUATIONS_PER_DAY + REVIEW_EVAL_DAILY_BUFFER),
        ),
      "触墙文案按承诺口径 5 次（不泄露 buffer）",
      blockLearn?.message,
    );
    assert(
      blockLearn?.scenario === "learn" && blockReview?.scenario === "review",
      "拦截结果回显请求场景（画像维度保留）",
    );

    // ── 2. buffer 边界：恰好 5 条放行 ────────────────────────────
    console.log("\n[2] 5+1 buffer 边界");
    const uidB = (await mkUser(`test_p3b_buf_${stamp}@test.local`)).userid;
    for (let i = 0; i < FREE_REVIEW_EVALUATIONS_PER_DAY; i++) {
      await mkEval(uidB, i % 2 === 0 ? "learn" : "review", new Date());
    }
    block = await checkEvaluationQuota(
      { role: "USER", userid: uidB },
      "review",
    );
    assert(
      block === null,
      `混合场景恰好 ${FREE_REVIEW_EVALUATIONS_PER_DAY} 条 → 仍放行（buffer 位兜底）`,
    );

    // ── 3. 日池自然日重置 ────────────────────────────────────────
    console.log("\n[3] 日池自然日重置语义");
    const uidC = (await mkUser(`test_p3b_day_${stamp}@test.local`)).userid;
    await mkEval(uidC, "learn", yesterday);
    await mkEval(uidC, "review", yesterday);
    const stC = await getEvaluationQuotaStatus(
      { role: "USER", userid: uidC },
      "learn",
    );
    assert(
      stC.used === 0,
      "昨日行（learn/review 均有）不计入今日日池",
      JSON.stringify(stC),
    );

    // ── 4. 会员直通 ──────────────────────────────────────────────
    console.log("\n[4] 有效订阅会员直通");
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

    // ── 5. 保存落库携带 scenario ─────────────────────────────────
    console.log("\n[5] saveSpeechResultCore 场景落库");
    // episodeid 有外键约束，借用库中现有剧集
    const ep = await prisma.episode.findFirst({
      select: { episodeid: true },
      orderBy: { episodeid: "asc" },
    });
    const epId = ep?.episodeid ?? "test_p3b";
    const uidE = (await mkUser(`test_p3b_save_${stamp}@test.local`)).userid;
    const saveReview = await saveSpeechResultCore(uidE, {
      episodeId: epId,
      targetText: "Quota review save",
      speechText: "quota review save",
      accuracyScore: 72,
      targetStartTime: 0,
      scenario: "review",
    });
    assert(
      !!saveReview.success && saveReview.data?.scenario === "review",
      "显式 review 保存 → 落库 scenario=review",
      JSON.stringify({ err: saveReview.error, s: saveReview.data?.scenario }),
    );
    const saveLearn = await saveSpeechResultCore(uidE, {
      episodeId: epId,
      targetText: "Quota learn save",
      speechText: "quota learn save",
      accuracyScore: 71,
      targetStartTime: 0,
    });
    assert(
      !!saveLearn.success && saveLearn.data?.scenario === "learn",
      "缺省保存 → 落库 scenario=learn（DB 默认）",
      JSON.stringify({ err: saveLearn.error, s: saveLearn.data?.scenario }),
    );

    // ── 6. quota 状态查询字段口径 ────────────────────────────────
    console.log("\n[6] getEvaluationQuotaStatus 字段口径");
    const stLearn = await getEvaluationQuotaStatus(
      { role: "USER", userid: uid },
      "learn",
    );
    const stReview = await getEvaluationQuotaStatus(
      { role: "USER", userid: uid },
      "review",
    );
    assert(
      stLearn.limit === FREE_REVIEW_EVALUATIONS_PER_DAY &&
        stReview.limit === FREE_REVIEW_EVALUATIONS_PER_DAY &&
        stLearn.used === stReview.used &&
        stLearn.used ===
          FREE_REVIEW_EVALUATIONS_PER_DAY + REVIEW_EVAL_DAILY_BUFFER,
      "learn/review 入口同池：limit 均 5、used 均为当日跨场景总数 6",
      JSON.stringify({ stLearn, stReview }),
    );
    assert(
      stLearn.remaining === 0 && stLearn.exhausted === true,
      "用满 6（5+buffer）→ remaining=0 / exhausted=true",
      JSON.stringify(stLearn),
    );
    assert(
      stLearn.scenario === "learn" && stReview.scenario === "review",
      "status 回显请求场景（兼容旧客户端）",
    );
    const uidD = (await mkUser(`test_p3b_rem_${stamp}@test.local`)).userid;
    for (let i = 0; i < FREE_REVIEW_EVALUATIONS_PER_DAY - 1; i++) {
      await mkEval(uidD, i % 2 === 0 ? "learn" : "review", new Date());
    }
    const stRem = await getEvaluationQuotaStatus(
      { role: "USER", userid: uidD },
      "learn",
    );
    assert(
      stRem.remaining === 2,
      "当日跨场景用 4 → remaining=2（1 承诺位 + 1 buffer 位）",
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
    const stSave = await getEvaluationQuotaStatus(
      { role: "USER", userid: uidE },
      "learn",
    );
    assert(
      stSave.used === 2,
      "落库画像行（1 learn + 1 review）计入同一日池 used=2",
      JSON.stringify(stSave),
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
