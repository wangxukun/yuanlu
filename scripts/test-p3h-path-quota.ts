 
/**
 * [P3-h] 学习路径配额 + AI 生成 service 自测（一次性脚本，测后清理）
 *
 * 覆盖：
 *  1. 免费用户创建第 1 条 → 成功（totalCount=1, limit=1）
 *  2. 免费用户创建第 2 条 → quotaExceeded（存量不动）
 *  3. 删除永不拦截：删掉后再创建 → 成功（腾出容量）
 *  4. [M1] 并发双击：0 基线并发 2 个 create → 恰好 1 个成功（咨询锁串行）
 *  5. PRO（有效订阅）连建 2 条 → 不限（limit=null）
 *  6. AI 生成：免费用户 → PREMIUM_REQUIRED（不触 LLM）
 *  7. AI 生成：PRO 空主题 → INVALID_TOPIC（不触 LLM）
 *  8. AI 生成：PRO 真实主题 → 真实 DeepSeek 调用，落库路径 + ≥3 条目
 *
 * 运行：npx tsx scripts/test-p3h-path-quota.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { learningPathService } from "../core/learning-path/learning-path.service";
import { pathGenerateService } from "../core/learning-path/path-generate.service";
import { FREE_PATH_LIMIT } from "../lib/quota";

const prisma = new PrismaClient();
const TS = Date.now();
const PASSWORD = "Test1234!";

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

const dto = (name: string) => ({
  pathName: name,
  description: "p3h test",
  isPublic: false,
});

async function createUser(email: string, premium: boolean) {
  const userid = `test_p3h_${premium ? "pro" : "free"}_${TS}`;
  await prisma.user.create({
    data: {
      userid,
      email,
      password: await bcrypt.hash(PASSWORD, 10),
      role: "USER",
      user_profile: { create: { nickname: email.split("@")[0] } },
      ...(premium && {
        subscriptions: {
          create: {
            subscriptionType: "PREMIUM",
            endDate: new Date(Date.now() + 30 * 86400_000),
          },
        },
      }),
    },
  });
  return userid;
}

async function cleanup(userid: string) {
  await prisma.learning_path_items.deleteMany({
    where: { path: { userid } },
  });
  await prisma.learning_paths.deleteMany({ where: { userid } });
  await prisma.subscriptions.deleteMany({ where: { userid } });
  await prisma.conversion_events.deleteMany({ where: { userid } });
  await prisma.user_profile.deleteMany({ where: { userid } });
  await prisma.user.delete({ where: { userid } });
}

async function main() {
  const freeId = await createUser(`p3h-free@test.local`, false);
  const proId = await createUser(`p3h-pro@test.local`, true);

  try {
    console.log("\n[1-2] 免费配额：第 1 条成功 / 第 2 条触墙");
    const r1 = await learningPathService.create(freeId, dto("F1"));
    assert(!!r1.path && !r1.quotaExceeded, "第 1 条创建成功");
    assert(
      r1.totalCount === 1 && r1.limit === FREE_PATH_LIMIT,
      "totalCount=1 / limit=1",
    );
    const r2 = await learningPathService.create(freeId, dto("F2"));
    assert(
      r2.quotaExceeded === true && !r2.path,
      "第 2 条 quotaExceeded（无落库）",
    );
    const cnt2 = await prisma.learning_paths.count({
      where: { userid: freeId },
    });
    assert(cnt2 === 1, "存量保持 1 条（触墙不写库）");

    console.log("\n[3] 删除永不拦截（腾出容量后可再建）");
    await learningPathService.delete(r1.path!.pathid, freeId);
    const r3 = await learningPathService.create(freeId, dto("F1b"));
    assert(!!r3.path, "删除后再创建成功");
    await learningPathService.delete(r3.path!.pathid, freeId);

    console.log("\n[4] M1 并发双击：0 基线并发 2 个 create");
    const [c1, c2] = await Promise.all([
      learningPathService.create(freeId, dto("R1")),
      learningPathService.create(freeId, dto("R2")),
    ]);
    const succ = [c1, c2].filter((r) => r.path).length;
    assert(
      succ === 1,
      `恰好 1 个成功（实际 ${succ}）`,
      JSON.stringify({ c1, c2 }),
    );
    const cnt4 = await prisma.learning_paths.count({
      where: { userid: freeId },
    });
    assert(cnt4 === 1, `库里恰好 1 条（实际 ${cnt4}）`);

    console.log("\n[5] PRO 无限路径");
    const p1 = await learningPathService.create(proId, dto("P1"));
    const p2 = await learningPathService.create(proId, dto("P2"));
    assert(!!p1.path && !!p2.path, "PRO 连建 2 条均成功");
    assert(p2.limit === null, "PRO limit=null（不限）");

    console.log("\n[6] AI 生成：免费用户墙（不触 LLM）");
    const g6 = await pathGenerateService.generate(
      freeId,
      "USER",
      "business english",
    );
    assert(
      g6.ok === false && g6.code === "PREMIUM_REQUIRED",
      "PREMIUM_REQUIRED",
    );

    console.log("\n[7] AI 生成：PRO 空主题（不触 LLM）");
    const g7 = await pathGenerateService.generate(proId, "USER", "   ");
    assert(g7.ok === false && g7.code === "INVALID_TOPIC", "INVALID_TOPIC");

    console.log(
      "\n[8] AI 生成：PRO 真实主题（真实 DeepSeek 调用，可能需要 10-30s）",
    );
    const g8 = await pathGenerateService.generate(
      proId,
      "USER",
      "商务英语入门",
    );
    if (g8.ok) {
      assert(!!g8.pathid, `生成成功 pathid=${g8.pathid}`);
      assert((g8.itemCount ?? 0) >= 3, `条目数 ≥3（实际 ${g8.itemCount}）`);
      const items = await prisma.learning_path_items.findMany({
        where: { pathid: g8.pathid },
        orderBy: { order: "asc" },
      });
      assert(items.length === g8.itemCount, "条目全部落库");
      assert(
        items.every((it, i, arr) => i === 0 || arr[i - 1].order < it.order),
        "order 连续递增（学习顺序）",
      );
      console.log(`  pathName=${g8.pathName} items=${items.length}`);
    } else {
      // 真实 LLM 失败（网络/key）不应让配额用例失分，但需明示
      assert(false, `真实 LLM 生成失败 code=${g8.code} msg=${g8.message}`);
    }
  } finally {
    await cleanup(freeId);
    await cleanup(proId);
    console.log("\n清理完成");
  }

  console.log(`\n结果：${passed} passed / ${failed} failed`);
  // 显式退出：导入链中的 @/auth（NextAuth）持有事件循环句柄，进程不会自然退出
  process.exit(failed > 0 ? 1 : 0);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
