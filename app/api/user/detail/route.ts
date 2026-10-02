import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/guard";

/**
 * GET /api/user/detail — 管理后台用户详情（[id]/setting 权限页数据源）。
 * [安全收紧 2026-10-03] 同 /api/user/list：加 requireAdmin + 移除 password；
 * 消费方 lib/data.fetchUserById 已同步转发会话 Cookie 并改 no-store
 * （转发凭据的 fetch 不得走缓存）。
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }
  const id = req.nextUrl.searchParams.get("id");
  console.log("[GET /api/user/detail]", id);

  // 验证参数有效性
  if (!id) {
    console.error("Invalid user ID", id);
    return NextResponse.json({ error: "Invalid user ID", status: 400 });
  }
  try {
    const user = await prisma.user.findFirst({
      where: {
        userid: id,
      },
      select: {
        // 明确选择需要字段（password 不外发——管理界面无消费）
        userid: true,
        email: true,
        role: true,
        languagePreference: true,
        createAt: true,
        updateAt: true,
        isOnline: true,
        lastActiveAt: true,
        isCommentAllowed: true,
        isLoginAllowed: true,
        emailVerified: true,
        subscriptions: {
          where: { subscriptionType: "PREMIUM" },
          orderBy: { endDate: "desc" },
          take: 1,
          select: {
            subscriptionid: true,
            subscriptionType: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });
    return NextResponse.json(user);
  } catch (error) {
    // 确保异常时也释放连接
    await prisma.$disconnect();
    console.error("[GET /api/user/detail]", error);
    return NextResponse.json({ error: "Internal Server Error", status: 500 });
  } finally {
    // 最佳实践：在finally块中执行清理操作
    await prisma.$disconnect();
  }
}
