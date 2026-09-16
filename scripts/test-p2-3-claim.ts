/**
 * [P2-3] 认领链路端到端自测（一次性脚本，测后清理）
 *
 * 覆盖：
 *  1. remarkMatchesUser 模糊归属（纯函数，含分隔符/大小写/短串拒绝）
 *  2. 管理员认领 NO_REMARK 套餐单 → 激活 30 天、claimedBy 落档
 *  3. 重复认领 → ORDER_ALREADY_HANDLED
 *  4. UNMATCHED_USER 套餐单 → 认领激活
 *  5. 续期累加：已有 10 天有效订阅 → 认领 30 天 ≈ now+40 天
 *  6. 无套餐赞助单 → ORDER_NOT_CLAIMABLE
 *  7. 金额不符单（planId 对、金额错）→ 认领返回 AMOUNT_MISMATCH、0 天
 *  8. markClaimRequested 只对待认领订单生效
 *
 * 运行：npx tsx scripts/test-p2-3-claim.ts
 */

import { PrismaClient } from "@prisma/client";
import {
  claimAndActivateOrder,
  markClaimRequested,
  remarkMatchesUser,
  OrderClaimError,
  CLAIMABLE_STATUSES,
} from "../core/afdian/order-claim.service";

const prisma = new PrismaClient();

const MONTHLY_PLAN_ID =
  process.env.VITE_AFDIAN_PLAN_ID_MONTHLY || "83afbe20380e11f1917552540025c377";

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

async function expectClaimError(
  fn: () => Promise<unknown>,
  code: string,
  name: string,
) {
  try {
    await fn();
    assert(false, name, "未按预期抛出 OrderClaimError");
  } catch (e) {
    assert(
      e instanceof OrderClaimError && e.code === code,
      name,
      `实际错误: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

async function main() {
  const TEST_PREFIX = `TEST_P23_${Date.now()}`;
  const testUserIds: string[] = [];

  try {
    // ── 1. remarkMatchesUser ─────────────────────────────────────────
    console.log("\n[1] remarkMatchesUser 模糊归属");
    const uid = "cmtestuserid1234567890";
    assert(
      remarkMatchesUser(`UID：${uid} 谢谢`, { userid: uid }),
      "全匹配（含中文冒号）",
    );
    assert(
      remarkMatchesUser("我的邮箱是 Foo.Bar@Example.com ", {
        userid: "other",
        email: "foo.bar@example.com",
      }),
      "邮箱大小写+符号归一",
    );
    assert(
      remarkMatchesUser("电话 138-1234-5678", {
        userid: "other",
        phone: "13812345678",
      }),
      "手机号带连字符",
    );
    assert(!remarkMatchesUser("随便留言", { userid: uid }), "无关留言不匹配");
    assert(
      !remarkMatchesUser("包含 ab", { userid: "ab" }),
      "短标识符（<6位）拒绝",
    );

    // ── 构造测试数据 ─────────────────────────────────────────────────
    const userA = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}_a@test.local`,
        role: "USER",
      },
    });
    const userB = await prisma.user.create({
      data: {
        email: `${TEST_PREFIX}_b@test.local`,
        role: "USER",
      },
    });
    testUserIds.push(userA.userid, userB.userid);

    // userB 预置一条 10 天后到期的订阅（验证续期累加）
    await prisma.subscriptions.create({
      data: {
        userid: userB.userid,
        subscriptionType: "PREMIUM",
        startDate: new Date(),
        endDate: new Date(Date.now() + 10 * 24 * 3600 * 1000),
      },
    });

    const orderNoRemark = await prisma.afdianOrder.create({
      data: {
        outTradeNo: `${TEST_PREFIX}_1`,
        planId: MONTHLY_PLAN_ID,
        amount: 18,
        status: "NO_REMARK",
      },
    });
    const orderUnmatched = await prisma.afdianOrder.create({
      data: {
        outTradeNo: `${TEST_PREFIX}_2`,
        planId: MONTHLY_PLAN_ID,
        amount: 36, // 两份月卡 = 60 天
        status: "UNMATCHED_USER",
        remark: "写错的UID",
      },
    });
    const orderRenewal = await prisma.afdianOrder.create({
      data: {
        outTradeNo: `${TEST_PREFIX}_3`,
        planId: MONTHLY_PLAN_ID,
        amount: 18,
        status: "NO_REMARK",
      },
    });
    const orderSponsor = await prisma.afdianOrder.create({
      data: {
        outTradeNo: `${TEST_PREFIX}_4`,
        amount: 66,
        status: "NO_REMARK", // 无套餐赞助：即使无留言也落 NO_REMARK
      },
    });
    const orderMismatch = await prisma.afdianOrder.create({
      data: {
        outTradeNo: `${TEST_PREFIX}_5`,
        planId: MONTHLY_PLAN_ID,
        amount: 1,
        status: "UNMATCHED_USER",
        remark: "写错的UID",
      },
    });

    // ── 2. 管理员认领 NO_REMARK ──────────────────────────────────────
    console.log("\n[2] 管理员认领无留言套餐单");
    const r1 = await claimAndActivateOrder({
      orderId: orderNoRemark.orderid,
      userid: userA.userid,
      claimedBy: "admin_test",
    });
    assert(
      r1.status === "ACTIVATED" && r1.daysAdded === 30,
      "激活 30 天",
      JSON.stringify(r1),
    );
    const o1 = await prisma.afdianOrder.findUniqueOrThrow({
      where: { orderid: orderNoRemark.orderid },
    });
    assert(
      o1.status === "ACTIVATED" && o1.userid === userA.userid,
      "订单终态 ACTIVATED + 归属",
    );
    assert(o1.claimedBy === "admin_test" && !!o1.claimedAt, "认领元数据落档");
    const subA = await prisma.subscriptions.findFirst({
      where: { userid: userA.userid, subscriptionType: "PREMIUM" },
    });
    assert(
      !!subA?.endDate &&
        Math.abs(
          subA.endDate.getTime() - (Date.now() + 30 * 24 * 3600 * 1000),
        ) <
          10 * 60 * 1000,
      "userA 订阅 ≈ now+30天",
    );

    // ── 3. 重复认领 ─────────────────────────────────────────────────
    console.log("\n[3] 重复认领拒绝");
    await expectClaimError(
      () =>
        claimAndActivateOrder({
          orderId: orderNoRemark.orderid,
          userid: userB.userid,
          claimedBy: "admin_test",
        }),
      "ORDER_ALREADY_HANDLED",
      "已激活订单再认领 → ORDER_ALREADY_HANDLED",
    );

    // ── 4. UNMATCHED_USER 认领（多份购买 60 天） ─────────────────────
    console.log("\n[4] 认领留言未匹配订单（36元=2份月卡）");
    const r2 = await claimAndActivateOrder({
      orderId: orderUnmatched.orderid,
      userid: userA.userid,
    });
    assert(
      r2.status === "ACTIVATED" && r2.daysAdded === 60,
      "60 天（2份月卡）",
      JSON.stringify(r2),
    );

    // ── 5. 续期累加 ─────────────────────────────────────────────────
    console.log("\n[5] 续期在剩余时长上累加");
    const r3 = await claimAndActivateOrder({
      orderId: orderRenewal.orderid,
      userid: userB.userid,
      claimedBy: "admin_test",
    });
    assert(r3.status === "ACTIVATED" && r3.isRenewal, "识别为续费");
    const subB = await prisma.subscriptions.findFirst({
      where: { userid: userB.userid, subscriptionType: "PREMIUM" },
      orderBy: { endDate: "desc" },
    });
    const subsB = await prisma.subscriptions.findMany({
      where: { userid: userB.userid, subscriptionType: "PREMIUM" },
    });
    assert(subsB.length === 1, "复用同一条订阅记录（非新建）");
    assert(
      !!subB?.endDate &&
        Math.abs(
          subB.endDate.getTime() - (Date.now() + 40 * 24 * 3600 * 1000),
        ) <
          10 * 60 * 1000,
      "到期 ≈ now+40天（剩余10天 + 30天）",
    );

    // ── 6. 无套餐赞助单不可加时 ──────────────────────────────────────
    console.log("\n[6] 赞助单（无 planId）认领不加时");
    // Webhook 对无留言单在计费判定前即落 NO_REMARK，赞助单（无 planId）
    // 也会以 NO_REMARK 入待认领池；认领时按契约返回 NON_PLAN_SPONSOR
    const r4 = await claimAndActivateOrder({
      orderId: orderSponsor.orderid,
      userid: userA.userid,
      claimedBy: "admin_test",
    });
    assert(
      r4.status === "NON_PLAN_SPONSOR",
      "返回 NON_PLAN_SPONSOR、0 天（API 层转 422 提示）",
      JSON.stringify(r4),
    );
    const o4 = await prisma.afdianOrder.findUniqueOrThrow({
      where: { orderid: orderSponsor.orderid },
    });
    assert(
      o4.status === "NON_PLAN_SPONSOR" && o4.daysGranted === 0,
      "赞助单流转终态 NON_PLAN_SPONSOR、0 天",
    );
    await expectClaimError(
      () =>
        claimAndActivateOrder({
          orderId: orderSponsor.orderid,
          userid: userA.userid,
          claimedBy: "admin_test",
        }),
      "ORDER_NOT_CLAIMABLE",
      "赞助单再认领 → ORDER_NOT_CLAIMABLE（终态不可逆）",
    );

    // ── 7. 金额不符单 ───────────────────────────────────────────────
    console.log("\n[7] 金额不符单（月卡ID付¥1）");
    const r5 = await claimAndActivateOrder({
      orderId: orderMismatch.orderid,
      userid: userA.userid,
      claimedBy: "admin_test",
    });
    assert(
      r5.status === "AMOUNT_MISMATCH",
      "返回 AMOUNT_MISMATCH、0 天",
      JSON.stringify(r5),
    );
    const subCountA = await prisma.subscriptions.count({
      where: { userid: userA.userid },
    });
    assert(subCountA === 1, "金额不符单未新增订阅/未加时");

    // ── 8. markClaimRequested 仅待认领可写 ──────────────────────────
    console.log("\n[8] 自助找回申请标记");
    const orderFresh = await prisma.afdianOrder.create({
      data: {
        outTradeNo: `${TEST_PREFIX}_6`,
        planId: MONTHLY_PLAN_ID,
        amount: 18,
        status: "UNMATCHED_USER",
        remark: "完全无关的留言",
      },
    });
    await markClaimRequested(orderFresh.outTradeNo, userA.userid);
    const o6 = await prisma.afdianOrder.findUniqueOrThrow({
      where: { orderid: orderFresh.orderid },
    });
    assert(
      o6.claimRequestedBy === userA.userid && !!o6.claimRequestedAt,
      "待认领订单登记申请成功",
    );
    await markClaimRequested(orderNoRemark.outTradeNo, userB.userid);
    const o1b = await prisma.afdianOrder.findUniqueOrThrow({
      where: { orderid: orderNoRemark.orderid },
    });
    assert(o1b.claimRequestedBy === null, "已激活订单不会被申请标记覆盖");

    // 常量导出 sanity
    assert(
      JSON.stringify(CLAIMABLE_STATUSES) ===
        JSON.stringify(["NO_REMARK", "UNMATCHED_USER"]),
      "CLAIMABLE_STATUSES 口径 = 无留言/未匹配",
    );

    console.log(
      `\n========== 结果：${passed} 通过 / ${failed} 失败 ==========`,
    );
  } finally {
    // ── 清理测试数据（订阅/通知随用户级联删除） ─────────────────────
    await prisma.afdianOrder.deleteMany({
      where: { outTradeNo: { startsWith: "TEST_P23_" } },
    });
    // 兼容清理历史运行可能残留的测试用户
    const leaked = await prisma.user.findMany({
      where: { email: { startsWith: "TEST_P23_" } },
      select: { userid: true },
    });
    const allTestIds = [...testUserIds, ...leaked.map((u) => u.userid)];
    if (allTestIds.length > 0) {
      await prisma.conversion_events.deleteMany({
        where: { userid: { in: allTestIds } },
      });
      await prisma.notifications.deleteMany({
        where: { userid: { in: allTestIds } },
      });
      await prisma.user.deleteMany({ where: { userid: { in: allTestIds } } });
    }
    console.log("[cleanup] 测试数据已清理");
    await prisma.$disconnect();
  }

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("测试脚本异常:", e);
  process.exit(1);
});
