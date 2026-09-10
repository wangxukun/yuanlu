import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/core/auth/guard";
import { deleteUser } from "@/core/user/user.service";

export async function DELETE(request: NextRequest) {
  try {
    // 1. ADMIN 角色校验
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    // 2. 解析参数（兼容 URL Query 和 JSON Body 两种方式）
    let userid: string | null = null;

    // 优先从 URL searchParams 获取（GET 风格）
    const { searchParams } = new URL(request.url);
    userid = searchParams.get("id");

    // 兜底从 JSON Body 获取（POST 风格）
    if (!userid) {
      try {
        const body = await request.json();
        userid = body.userid || body.id || null;
      } catch {
        // Body 解析失败则跳过
      }
    }

    if (!userid) {
      return NextResponse.json(
        { success: false, error: "缺少用户 ID 参数" },
        { status: 400 },
      );
    }

    // 3. 透传调用 Core Service
    const result = await deleteUser(userid, guard.session.user.userid);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "redirect:/admin/users/delete-success",
        detail: result.message,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API] Delete user error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
