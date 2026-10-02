import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { deriveDisplayRole } from "@/lib/premium-role";
import { requireAdmin } from "@/core/auth/guard";

/**
 * GET /api/user/list — 管理后台用户列表（admin/users 页数据源）。
 * [安全收紧 2026-10-03] 此前路由无鉴权守卫（middleware 对 /api/* 放行）
 * 且 select 含 password 字段——全量用户+密码哈希可被匿名拉取。现加
 * requireAdmin（ADMIN 门槛）并移除 password（响应不再外发哈希）；
 * 消费方 lib/data.fetchUsers 已同步转发会话 Cookie。
 */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }
  try {
    // 获取所有分类数据（添加take限制防止全表扫描）
    const users = await prisma.user.findMany({
      select: {
        // 明确选择需要字段（password 不外发——管理界面无消费）
        userid: true,
        email: true,
        role: true,
        createAt: true,
        updateAt: true,
        isOnline: true,
        lastActiveAt: true,
        isCommentAllowed: true,
        isLoginAllowed: true,
        loginCount: true,
        registerIp: true,
        emailVerified: true,
        user_profile: {
          select: {
            // 明确选择需要字段
            nickname: true,
            avatarUrl: true,
            avatarFileName: true,
            bio: true,
            learnLevel: true,
          },
        },
        // [T5.4 真机联调 2026-10-02] 会员事实在订阅表：附每用户最新有效
        // PREMIUM 订阅到期日，供下方 role 派生（admin「高级会员」筛选/
        // 角标此前按 DB role 列筛，纯小程序付费用户 role 不自动翻被漏掉）
        subscriptions: {
          where: { subscriptionType: "PREMIUM", endDate: { gte: new Date() } },
          orderBy: { endDate: "desc" },
          take: 1,
          select: { endDate: true },
        },
      },
    });
    // role 按订阅事实派生（口径红线：任何暴露 role 的地方必须经
    // deriveDisplayRole——status/profile 接口同源；ADMIN 直通、有效订阅
    // → PREMIUM、其余 USER。响应形状不变，subscriptions 不外发）
    return NextResponse.json(
      users.map(({ subscriptions, ...user }) => ({
        ...user,
        role: deriveDisplayRole(user.role, subscriptions[0]?.endDate ?? null),
      })),
    );
  } catch (error) {
    // 确保异常时也释放连接
    await prisma.$disconnect();
    console.error("[GET /api/user/list]", error);
    return NextResponse.json({ error: "Internal Server Error", status: 500 });
  } finally {
    // 最佳实践：在finally块中执行清理操作
    await prisma.$disconnect();
  }
}
