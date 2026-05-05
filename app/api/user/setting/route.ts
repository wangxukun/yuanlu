import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, isValidRole } from "@/core/auth/guard";

export async function PUT(request: NextRequest) {
  try {
    // [安全修复] 添加 ADMIN 角色校验 — 只有管理员才能修改用户权限
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    // 解析请求体获取 userid
    const { userid, role, isCommentAllowed, isLoginAllowed } =
      await request.json();

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
    const dataToUpdate: {
      role: string;
      isCommentAllowed: boolean;
      isLoginAllowed?: boolean;
      isOnline?: boolean;
    } = {
      role: role,
      isCommentAllowed: isCommentAllowed,
    };

    // 处理登录权限及对应的离线操作
    if (isLoginAllowed !== undefined) {
      dataToUpdate.isLoginAllowed = isLoginAllowed;
      if (isLoginAllowed === false) {
        dataToUpdate.isOnline = false;
      }
    }

    // 执行更新操作
    const updateUser = await prisma.user.update({
      where: {
        userid: userid,
      },
      data: dataToUpdate,
    });

    return NextResponse.json(
      { message: "User updated successfully", user: updateUser },
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
