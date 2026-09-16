import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/guard";
import { CLAIMABLE_STATUSES } from "@/core/afdian/order-claim.service";
import { resolvePlanGrant } from "@/lib/afdian-plans";

/**
 * [P2-3] 管理端认领面板数据接口：
 * - ?userSearch=xxx  按UID/邮箱/手机号搜索用户（认领绑定目标）
 * - ?tab=pending     待认领订单池（NO_REMARK / UNMATCHED_USER）
 * - ?tab=history     近期认领记录（ACTIVATED 且经认领流转）
 */

const PLAN_LABELS: Record<string, string> = {
  WEEKLY: "周卡",
  MONTHLY: "月卡",
  QUARTERLY: "季卡",
  YEARLY: "年卡",
};

function describePlan(planId: string | null, amount: number) {
  const grant = resolvePlanGrant(planId, amount);
  return {
    planName: grant.planKey ? PLAN_LABELS[grant.planKey] : null,
    expectedDays: grant.days,
    grantStatus: grant.status,
  };
}

async function enrichUsers(userids: (string | null | undefined)[]) {
  const ids = [...new Set(userids.filter((id): id is string => !!id))];
  if (ids.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { userid: { in: ids } },
    select: {
      userid: true,
      email: true,
      phone: true,
      user_profile: { select: { nickname: true } },
    },
  });
  return new Map(
    users.map((u) => [
      u.userid,
      {
        userid: u.userid,
        nickname: u.user_profile?.nickname ?? null,
        email: u.email,
        phone: u.phone,
      },
    ]),
  );
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);

  // 用户搜索：认领面板的绑定目标检索
  const userSearch = url.searchParams.get("userSearch")?.trim();
  if (userSearch) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { userid: { contains: userSearch } },
          { email: { contains: userSearch } },
          { phone: { contains: userSearch } },
        ],
      },
      select: {
        userid: true,
        email: true,
        phone: true,
        user_profile: { select: { nickname: true } },
      },
      take: 10,
      orderBy: { createAt: "desc" },
    });
    return NextResponse.json({
      users: users.map((u) => ({
        userid: u.userid,
        nickname: u.user_profile?.nickname ?? null,
        email: u.email,
        phone: u.phone,
      })),
    });
  }

  const tab = url.searchParams.get("tab") === "history" ? "history" : "pending";
  const q = url.searchParams.get("q")?.trim();

  if (tab === "pending") {
    const orders = await prisma.afdianOrder.findMany({
      where: {
        status: { in: [...CLAIMABLE_STATUSES] },
        ...(q
          ? {
              OR: [
                { outTradeNo: { contains: q } },
                { remark: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { createAt: "desc" },
      take: 100,
    });

    const userMap = await enrichUsers(orders.map((o) => o.claimRequestedBy));

    return NextResponse.json({
      orders: orders.map((o) => ({
        orderid: o.orderid,
        outTradeNo: o.outTradeNo,
        amount: o.amount.toNumber(),
        planId: o.planId,
        status: o.status,
        remark: o.remark,
        createAt: o.createAt.toISOString(),
        claimRequestedAt: o.claimRequestedAt?.toISOString() ?? null,
        claimRequestedUser: o.claimRequestedBy
          ? (userMap.get(o.claimRequestedBy) ?? null)
          : null,
        ...describePlan(o.planId, o.amount.toNumber()),
      })),
    });
  }

  // 认领历史：ACTIVATED 且带认领元数据（claimedBy 非空 = 管理员认领；
  // claimedBy 为空 = 用户自助找回，两者都进历史便于追溯）
  const orders = await prisma.afdianOrder.findMany({
    where: {
      status: "ACTIVATED",
      claimedAt: { not: null },
      ...(q
        ? {
            OR: [{ outTradeNo: { contains: q } }, { remark: { contains: q } }],
          }
        : {}),
    },
    orderBy: { claimedAt: "desc" },
    take: 50,
  });

  const userMap = await enrichUsers([
    ...orders.map((o) => o.userid),
    ...orders.map((o) => o.claimedBy),
  ]);

  return NextResponse.json({
    orders: orders.map((o) => ({
      orderid: o.orderid,
      outTradeNo: o.outTradeNo,
      amount: o.amount.toNumber(),
      status: o.status,
      remark: o.remark,
      createAt: o.createAt.toISOString(),
      daysGranted: o.daysGranted,
      claimedAt: o.claimedAt?.toISOString() ?? null,
      targetUser: o.userid ? (userMap.get(o.userid) ?? null) : null,
      claimedByUser: o.claimedBy ? (userMap.get(o.claimedBy) ?? null) : null,
      selfService: !o.claimedBy,
      ...describePlan(o.planId, o.amount.toNumber()),
    })),
  });
}
