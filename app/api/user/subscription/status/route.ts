import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { formatChineseDate } from "@/lib/tools";
import { deriveDisplayRole } from "@/lib/premium-role";
import { authWithMobile } from "@/core/auth/guard";

export async function GET() {
  // [P1-3] Cookie 会话优先、移动端 Bearer JWT 兜底：
  // Android 订阅激活轮询（feat/android-app 分支）此前在此恒 401，
  // 付费后无法感知激活。middleware 对 /api/* 全放行，此处是唯一鉴权点。
  const session = await authWithMobile();
  if (!session?.user?.userid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { userid: session.user.userid },
      select: {
        role: true,
        subscriptions: {
          where: { subscriptionType: "PREMIUM", endDate: { gte: new Date() } },
          orderBy: { endDate: "desc" },
          take: 1,
          select: { endDate: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const activeSubscription = user.subscriptions[0];
    const expiryDate = activeSubscription?.endDate
      ? formatChineseDate(activeSubscription.endDate)
      : null;

    // [P0-1/P1-2] role 按订阅状态派生，而非回传 DB 静态值：
    // Webhook 激活已停写 role，订阅页的激活轮询若依赖 DB role，
    // 新付费用户将永远等不到 "PREMIUM"，祝贺闪示不再触发。
    // 派生规则统一走 lib/premium-role（与 auth.ts 会话同步同口径）。
    const role = deriveDisplayRole(
      user.role,
      activeSubscription?.endDate ?? null,
    );

    return NextResponse.json({
      role,
      expiryDate: expiryDate,
      // [P2-2/F5] 原始到期时间戳：续费判定改用时间比较，不再比对格式化中文日期串
      expiryAt: activeSubscription?.endDate
        ? activeSubscription.endDate.toISOString()
        : null,
    });
  } catch (error) {
    console.error("[Subscription Status API Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
