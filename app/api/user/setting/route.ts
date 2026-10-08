import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, isValidRole } from "@/core/auth/guard";
import { extendPremiumSubscription } from "@/core/subscription/grant.service";
import { Prisma } from "@prisma/client";

export async function PUT(request: NextRequest) {
  try {
    // [安全修复] 添加 ADMIN 角色校验 — 只有管理员才能修改用户权限
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    // 解析请求体获取 userid
    const {
      userid,
      role,
      isCommentAllowed,
      isLoginAllowed,
      premiumDurationDays,
      isOnline,
    } = await request.json();

    // 验证参数有效性
    if (!userid) {
      console.error("Invalid user ID", userid);
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // [安全修复] 验证角色值合法性，防止注入无效角色
    if (role && !isValidRole(role)) {
      return NextResponse.json(
        { error: "Invalid role value" },
        { status: 400 },
      );
    }

    // [安全修复] 防止管理员修改自己的角色（降权保护）
    if (userid === guard.session.user.userid && role !== "ADMIN") {
      return NextResponse.json(
        { error: "管理员不能降低自己的角色" },
        { status: 400 },
      );
    }

    // 手动赠送时长校验：前端预设 7/30/90/180/365 天，此处仍须校验
    // 类型与范围——非整数（含字符串）、0、负数或超长值一律拒绝，
    // 防止脏值进入日期运算（如字符串与 getDate() 拼接出离谱 endDate）
    const premiumDays = premiumDurationDays ?? 30;
    if (role === "PREMIUM") {
      if (
        !Number.isInteger(premiumDays) ||
        premiumDays < 1 ||
        premiumDays > 3650
      ) {
        return NextResponse.json(
          { error: "Invalid premiumDurationDays（须为 1-3650 的整数天）" },
          { status: 400 },
        );
      }
    }

    // 预备更新的数据对象
    const dataToUpdate: Prisma.UserUpdateInput = {
      role: role,
      isCommentAllowed: isCommentAllowed,
    };

    // 处理登录权限及对应的离线操作
    if (isLoginAllowed !== undefined) {
      dataToUpdate.isLoginAllowed = isLoginAllowed;
      if (isLoginAllowed === false) {
        dataToUpdate.isOnline = false;
        dataToUpdate.sessionVersion = { increment: 1 };
      }
    }

    // 处理单独的离线状态更新（如：踢出用户）
    if (isOnline !== undefined) {
      dataToUpdate.isOnline = isOnline;
      if (isOnline === false) {
        dataToUpdate.sessionVersion = { increment: 1 };
      }
    }

    // 使用事务保证 User.role 更新和 subscription 记录创建的原子性
    const result = await prisma.$transaction(async (tx) => {
      // 1. 更新用户基础信息
      const updatedUser = await tx.user.update({
        where: { userid },
        data: dataToUpdate,
      });

      // 2. 当角色设为 PREMIUM 时，走共享续期管道发放订阅
      //    （core/subscription/grant.service，与爱发电激活、虚拟支付发货
      //    同一函数不分叉——SUBSCRIBE-TASK 1.3 口径红线。此前本路由内联
      //    重写了一套续期逻辑，会复用过期订阅行并改写其起止时间，破坏
      //    付费历史记录；共享管道则保留过期行、新建行从当前时刻起算）
      let subscription: { endDate: Date } | null = null;
      if (role === "PREMIUM") {
        const { newExpiryDate } = await extendPremiumSubscription(
          tx,
          userid,
          premiumDays,
        );
        subscription = { endDate: newExpiryDate };
      } else if (role) {
        // 角色被改为非 PREMIUM（如管理员撤销会员）时，需同步取消仍在有效期内的订阅，
        // 否则 isPremiumUser 的"有效订阅"通道会在订阅自然到期前继续放行
        await tx.subscriptions.updateMany({
          where: {
            userid,
            subscriptionType: "PREMIUM",
            endDate: { gt: new Date() },
          },
          data: { endDate: new Date() },
        });
      }

      return { updatedUser, subscription };
    });

    return NextResponse.json(
      {
        message: "User updated successfully",
        user: result.updatedUser,
        subscription: result.subscription,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update user setting error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
