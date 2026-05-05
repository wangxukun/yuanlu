import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/guard";

export async function DELETE(request: NextRequest) {
  try {
    // [安全修复] 添加 ADMIN 角色校验 — 只有管理员才能删除用户
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    // 1. 从 URL 查询参数中获取 id
    // URL 示例: /api/user/delete?id=cmjuubnk...
    const { searchParams } = new URL(request.url);
    const userid = searchParams.get("id");

    // 验证参数有效性
    if (!userid) {
      console.error("Invalid user ID", userid);
      return NextResponse.json({ error: "Invalid user ID", status: 400 });
    }

    // [安全修复] 防止管理员删除自己
    if (userid === guard.session.user.userid) {
      return NextResponse.json(
        { error: "不能删除自己的账号" },
        { status: 400 },
      );
    }

    // 执行删除操作
    const deletedUser = await prisma.user.deleteMany({
      where: {
        userid: userid,
      },
    });

    // 检查是否成功删除
    if (deletedUser.count === 0) {
      return NextResponse.json({ error: "User not found", status: 404 });
    }

    return NextResponse.json(
      { message: "redirect:/admin/users/delete-success" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
