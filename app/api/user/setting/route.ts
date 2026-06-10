import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, isValidRole } from "@/core/auth/guard";
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

      // 2. 当角色设为 PREMIUM 时，自动创建/延期订阅记录
      let subscription = null;
      if (role === "PREMIUM") {
        const durationDays = premiumDurationDays ?? 30; // 默认30天（一个月）
        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + durationDays);

        // 查找该用户现有的 PREMIUM 订阅
        const existingSubscription = await tx.subscriptions.findFirst({
          where: {
            userid,
            subscriptionType: "PREMIUM",
          },
          orderBy: { endDate: "desc" },
        });

        if (existingSubscription) {
          // 续期：如果当前订阅未过期，则在原结束日期基础上续期；否则从现在开始
          const baseDate =
            existingSubscription.endDate && existingSubscription.endDate > now
              ? existingSubscription.endDate
              : now;
          const newEndDate = new Date(baseDate);
          newEndDate.setDate(newEndDate.getDate() + durationDays);

          subscription = await tx.subscriptions.update({
            where: { subscriptionid: existingSubscription.subscriptionid },
            data: {
              startDate:
                existingSubscription.endDate &&
                existingSubscription.endDate > now
                  ? existingSubscription.startDate // 保留原始开始日期
                  : now,
              endDate: newEndDate,
            },
          });
        } else {
          // 新建订阅记录
          subscription = await tx.subscriptions.create({
            data: {
              userid,
              subscriptionType: "PREMIUM",
              startDate: now,
              endDate,
            },
          });
        }
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
