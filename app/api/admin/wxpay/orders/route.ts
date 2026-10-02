import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/guard";

/**
 * [模块E T4.6] 管理端微信虚拟支付订单列表（对齐 /api/admin/afdian/orders
 * 先例：requireAdmin 强校验 + enrichUsers 带用户昵称/邮箱）。
 *
 * GET ?status=PENDING|ACTIVATED|AMOUNT_MISMATCH|REFUNDED|CLOSED&q=搜索
 *   - q 匹配 outTradeNo / wxOrderId / productId / 用户邮箱；
 *   - 返回近 100 笔（createAt 倒序）+ 全状态机计数汇总；
 *   - 月限额 / 账单核对走 MP 后台人工口径（附录 B），本接口只管订单事实。
 */

const PLAN_LABELS: Record<string, string> = {
  WEEKLY: "周卡",
  MONTHLY: "月卡",
  QUARTERLY: "季卡",
  YEARLY: "年卡",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "待支付/待推送",
  ACTIVATED: "已发货",
  AMOUNT_MISMATCH: "对账不符（转人工）",
  REFUNDED: "已退款（人工）",
  CLOSED: "已关闭",
};

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
  const status = url.searchParams.get("status")?.trim();
  const q = url.searchParams.get("q")?.trim();

  const emails = q
    ? (
        await prisma.user.findMany({
          where: { email: { contains: q } },
          select: { userid: true },
          take: 20,
        })
      ).map((u) => u.userid)
    : [];

  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { outTradeNo: { contains: q } },
            { wxOrderId: { contains: q } },
            { productId: { contains: q } },
            { userid: { in: emails } },
          ],
        }
      : {}),
  };

  const [orders, grouped] = await Promise.all([
    prisma.wxpayOrder.findMany({
      where,
      orderBy: { createAt: "desc" },
      take: 100,
    }),
    prisma.wxpayOrder.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { amountFen: true },
    }),
  ]);

  const userMap = await enrichUsers(orders.map((o) => o.userid));

  return NextResponse.json({
    orders: orders.map((o) => ({
      orderid: o.orderid,
      outTradeNo: o.outTradeNo,
      wxOrderId: o.wxOrderId,
      status: o.status,
      statusLabel: STATUS_LABELS[o.status] ?? o.status,
      planKey: o.planKey,
      planName: PLAN_LABELS[o.planKey] ?? o.planKey,
      productId: o.productId,
      buyQuantity: o.buyQuantity,
      amountFen: o.amountFen,
      daysGranted: o.daysGranted,
      createAt: o.createAt,
      updateAt: o.updateAt,
      user: o.userid ? (userMap.get(o.userid) ?? null) : null,
    })),
    stats: Object.fromEntries(
      grouped.map((g) => [
        g.status,
        { count: g._count._all, amountFen: g._sum.amountFen ?? 0 },
      ]),
    ),
    statusLabels: STATUS_LABELS,
  });
}
