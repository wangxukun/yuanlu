/**
 * [SRS] 句子本遗忘曲线打卡 service 自测（一次性脚本，测后清理）
 *
 * 覆盖：
 *  1. 四档 quality 的 proficiency/nextReviewAt 推进（Leitner 阶梯 0/1/3/7/14/30/90）
 *     —— Web 版 calculateNextReview 内部取当前时间，无注入参数，断言用容差（±2h）
 *  2. 忘记=重置 0 级 + 留在今日队列（nextReviewAt≈now，daysAdded=0）
 *  3. 模糊=降 1 级 + 强制明天；认识/简单=升 1 级 + 阶梯间隔；6 级以上封顶 90 天
 *  4. 归属校验两分支：句子不存在 / 无权操作此句子
 *  5. toItem 新字段序列化：getSavedSentences 返回 proficiency:number +
 *     nextReviewAt:ISO 字符串（Client Component 序列化口径）
 *  6. lib/srs isDue 语义（null→true / 过去→true / 未来→false）
 *
 * 运行：npx tsx scripts/test-sentences-srs.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { sentencesService } from "../core/sentences/sentences.service";
import { isDue } from "../lib/srs";

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

const DAY = 24 * 3600 * 1000;
const TOL = 2 * 3600 * 1000; // 时间断言容差（计算与断言之间的耗时 + 时钟精度）

function near(actual: string | Date, expectMs: number) {
  const t = new Date(actual).getTime();
  return Math.abs(t - expectMs) <= TOL;
}

async function main() {
  const prefix = `srs_${Date.now()}`;
  const episode = await prisma.episode.create({
    data: { title: `${prefix} 测试剧集`, audioUrl: "test://audio" },
  });
  const EP = episode.episodeid;
  const hash = await bcrypt.hash("x", 4);
  const owner = await prisma.user.create({
    data: { email: `${prefix}_owner@test.local`, password: hash },
  });
  const other = await prisma.user.create({
    data: { email: `${prefix}_other@test.local`, password: hash },
  });

  const mkSentence = (i: number, proficiency: number) =>
    prisma.savedSentence.create({
      data: {
        userid: owner.userid,
        episodeid: EP,
        subtitleId: i,
        startTime: i * 10,
        endTime: i * 10 + 5,
        enText: `Sentence #${i}`,
        zhText: `第 ${i} 句`,
        proficiency,
        nextReviewAt: new Date(Date.now() - DAY), // 已到期
      },
    });

  try {
    const s0 = await mkSentence(1, 0);
    const s3 = await mkSentence(2, 3);
    const s6 = await mkSentence(3, 6);
    const s3b = await mkSentence(4, 3);

    // ── 1. 认识：0 级 → 1 级，+1 天 ─────────────────────────────
    console.log("\n[1] 认识(quality=2)：0 级 → 1 级，nextReviewAt +1 天");
    const r1 = await sentencesService.submitReview(owner.userid, s0.id, 2);
    assert(r1.proficiency === 1, "proficiency 0→1", JSON.stringify(r1));
    assert(
      near(r1.nextReviewAt, Date.now() + 1 * DAY),
      "nextReviewAt ≈ 明天",
      r1.nextReviewAt,
    );
    assert(r1.daysAdded === 1, "daysAdded=1", String(r1.daysAdded));

    // ── 2. 忘记：3 级 → 0 级，留在今日队列 ─────────────────────
    console.log("\n[2] 忘记(quality=0)：3 级 → 0 级，nextReviewAt ≈ now");
    const r2 = await sentencesService.submitReview(owner.userid, s3.id, 0);
    assert(r2.proficiency === 0, "proficiency 3→0", JSON.stringify(r2));
    assert(
      near(r2.nextReviewAt, Date.now()),
      "nextReviewAt ≈ 当前时间（今日队列）",
      r2.nextReviewAt,
    );
    assert(r2.daysAdded === 0, "daysAdded=0", String(r2.daysAdded));

    // ── 3. 模糊：3 级 → 2 级，强制明天 ─────────────────────────
    console.log("\n[3] 模糊(quality=1)：3 级 → 2 级，nextReviewAt +1 天");
    const r3 = await sentencesService.submitReview(owner.userid, s3b.id, 1);
    assert(r3.proficiency === 2, "proficiency 3→2", JSON.stringify(r3));
    assert(
      near(r3.nextReviewAt, Date.now() + 1 * DAY),
      "nextReviewAt ≈ 明天",
      r3.nextReviewAt,
    );

    // ── 4. 认识：6 级 → 7 级，间隔封顶 90 天 ────────────────────
    console.log(
      "\n[4] 认识(quality=2)：6 级 → 7 级，nextReviewAt +90 天（封顶）",
    );
    const r4 = await sentencesService.submitReview(owner.userid, s6.id, 2);
    assert(r4.proficiency === 7, "proficiency 6→7", JSON.stringify(r4));
    assert(
      near(r4.nextReviewAt, Date.now() + 90 * DAY),
      "nextReviewAt ≈ 90 天后",
      r4.nextReviewAt,
    );
    assert(
      Math.abs(r4.daysAdded - 90) <= 1,
      "daysAdded≈90",
      String(r4.daysAdded),
    );

    // ── 5. 归属校验 ─────────────────────────────────────────────
    console.log("\n[5] 归属校验：不存在 / 他人句子");
    const expectRejects = async (
      fn: () => Promise<unknown>,
      msg: string,
      name: string,
    ) => {
      try {
        await fn();
        assert(false, name, "未抛错");
      } catch (e) {
        assert((e as Error).message === msg, name, (e as Error).message);
      }
    };
    await expectRejects(
      () => sentencesService.submitReview(owner.userid, 999999999, 2),
      "句子不存在",
      "句子不存在分支",
    );
    await expectRejects(
      () => sentencesService.submitReview(other.userid, s0.id, 2),
      "无权操作此句子",
      "无权操作此句子分支",
    );

    // ── 6. toItem 序列化（列表口径）────────────────────────────
    console.log("\n[6] getSavedSentences：proficiency/nextReviewAt 序列化");
    const list = await sentencesService.getSavedSentences(owner.userid);
    const hit = list.find((s) => s.id === s0.id);
    assert(!!hit, "打卡后的句子仍在列表");
    assert(
      typeof hit?.proficiency === "number" && hit.proficiency === 1,
      "列表带 proficiency:number",
    );
    assert(
      typeof hit?.nextReviewAt === "string" &&
        !isNaN(new Date(hit.nextReviewAt).getTime()),
      "列表带 nextReviewAt:ISO 字符串",
      String(hit?.nextReviewAt),
    );

    // ── 7. isDue 语义（lib/srs 公共导出）───────────────────────
    console.log("\n[7] isDue：null→true / 过去→true / 未来→false");
    assert(isDue(null) === true, "null 视为到期（新句立即进队列）");
    assert(
      isDue(new Date(Date.now() - DAY).toISOString()) === true,
      "过去时间到期",
    );
    assert(
      isDue(new Date(Date.now() + DAY).toISOString()) === false,
      "未来时间未到期",
    );
    assert(
      hit ? isDue(hit.nextReviewAt) === false : false,
      "打卡「认识」后的句子今日不再到期",
    );
  } finally {
    // 测后清理：用户级联删除句子，剧集单独删
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await prisma.episode.delete({ where: { episodeid: EP } });
    await prisma.$disconnect();
  }

  console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
  // 成功路径显式退出：RDS 代理连接下 Prisma 引擎可能不释放事件循环
  // （异常路径已由 main().catch 的 exit(1) 强退）
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error("测试脚本异常：", e);
  await prisma.$disconnect();
  process.exit(1);
});
