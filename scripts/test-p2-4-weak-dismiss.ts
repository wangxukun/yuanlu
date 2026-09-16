/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * [P2-4] 弱项本共享 service 自测（一次性脚本，测后清理）
 *
 * 覆盖：
 *  1. 分数线口径：自定义 weakScoreThreshold=60 时，65 分句子不算弱项
 *     （旧硬编码 80 口径下会被误判——N1/N2 分叉点的正面回归用例）
 *  2. Step A/B/C 语义保留：旧低分+新达标（≥阈值）→ 不在弱项本
 *  3. dismiss 打标后隐藏
 *  4. 打标后出现新的低分评测 → 自动重回弱项本（召回语义）
 *  5. dismissWeakSentence 幂等（重复打标刷新时间，不报错）
 *
 * 运行：npx tsx scripts/test-p2-4-weak-dismiss.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  getWeakSentences,
  dismissWeakSentence,
} from "../core/speech/weak-sentences.service";

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
  const uid = `test_p24_${Date.now()}`;
  try {
    await prisma.user.create({
      data: {
        userid: uid,
        email: `${uid}@test.local`,
        role: "USER",
        user_profile: { create: { weakScoreThreshold: 60 } },
      },
    });

    const texts = (s: string) => s;

    // ── 造评测流水 ────────────────────────────────────────────────
    // S1: 最新一次 50（<60）→ 弱项
    await prisma.speech_recognition.create({
      data: {
        userid: uid,
        targetText: texts("S1"),
        overallScore: 50,
        targetStartTime: 1,
      },
    });
    // S2: 最新一次 65（≥60 但 <80）→ 自定义阈值下不算弱项（硬编码 80 会误判）
    await prisma.speech_recognition.create({
      data: {
        userid: uid,
        targetText: texts("S2"),
        overallScore: 65,
        targetStartTime: 2,
      },
    });
    // S3: 旧 40 + 新 75（≥60）→ 最新已达标，不算弱项
    await prisma.speech_recognition.create({
      data: {
        userid: uid,
        targetText: texts("S3"),
        overallScore: 40,
        targetStartTime: 3,
        recognitionDate: new Date(Date.now() - 90_000),
      },
    });
    await prisma.speech_recognition.create({
      data: {
        userid: uid,
        targetText: texts("S3"),
        overallScore: 75,
        targetStartTime: 3,
        recognitionDate: new Date(Date.now() - 60_000),
      },
    });
    // S4: 55 → 弱项，用于 dismiss 测试
    await prisma.speech_recognition.create({
      data: {
        userid: uid,
        targetText: texts("S4"),
        overallScore: 55,
        targetStartTime: 4,
        recognitionDate: new Date(Date.now() - 30_000),
      },
    });

    // ── 1&2: 阈值口径 + Step A/B/C ───────────────────────────────
    console.log("\n[1] 自定义分数线（60）口径");
    const r1 = await getWeakSentences(uid);
    const t1 = r1.records.map((r: any) => r.targetText);
    assert(r1.threshold === 60, "返回实际生效阈值 60");
    assert(t1.includes("S1"), "50 分句子在弱项本");
    assert(
      !t1.includes("S2"),
      "65 分句子不在弱项本（≥60 即达标，硬编码 80 会误判）",
    );
    assert(
      !t1.includes("S3"),
      "旧低分+新 75 分句子不在弱项本（Step A/B/C 语义保留）",
    );

    // ── 3: dismiss 打标隐藏 ──────────────────────────────────────
    console.log("\n[2] 标记已攻克");
    await dismissWeakSentence(uid, "S1");
    await dismissWeakSentence(uid, "S1"); // 幂等
    const r2 = await getWeakSentences(uid);
    assert(
      !r2.records.some((r: any) => r.targetText === "S1"),
      "打标后 S1 从弱项本消失（幂等重复打标不报错）",
    );

    // ── 4: 打标后新低分 → 召回 ───────────────────────────────────
    console.log("\n[3] 打标后新低分评测自动召回");
    await prisma.speech_recognition.create({
      data: {
        userid: uid,
        targetText: texts("S1"),
        overallScore: 45,
        targetStartTime: 1,
        recognitionDate: new Date(),
      },
    });
    const r3 = await getWeakSentences(uid);
    assert(
      r3.records.some((r: any) => r.targetText === "S1"),
      "标记后再次出现 45 分新评测 → S1 重回弱项本",
    );

    // ── 5: 未传阈值时读 user_profile ────────────────────────────
    console.log("\n[4] 阈值缺省读取");
    await prisma.user_profile.update({
      where: { userid: uid },
      data: { weakScoreThreshold: 90 },
    });
    const r4 = await getWeakSentences(uid);
    assert(r4.threshold === 90, "未传 threshold 时从 user_profile 读取（90）");
    const r5 = await getWeakSentences(uid, { threshold: 60 });
    assert(r5.threshold === 60, "显式传入 threshold 时以传入值为准");

    // S2（65）在阈值 90 下应重新进入弱项本
    assert(
      r4.records.some((r: any) => r.targetText === "S2"),
      "阈值调高到 90 后，65 分句子重新成为弱项（口径联动）",
    );

    console.log(
      `\n========== 结果：${passed} 通过 / ${failed} 失败 ==========`,
    );
  } finally {
    await prisma.speech_recognition.deleteMany({ where: { userid: uid } });
    await prisma.dismissed_pronunciation.deleteMany({ where: { userid: uid } });
    await prisma.user.deleteMany({ where: { userid: uid } });
    console.log("[cleanup] 测试数据已清理");
    await prisma.$disconnect();
  }
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("测试脚本异常:", e);
  process.exit(1);
});
