import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { deleteUser } from "@/core/user/user.service";

export async function DELETE() {
  try {
    // 1. 鉴权：只需登录即可，无需管理员
    const guard = await requireAuth();
    if (!guard.ok) return guard.response;

    const userid = guard.session.user.userid;

    // 2. 调用核心服务删除自己，传入 allowSelfDelete: true
    const result = await deleteUser(userid, userid, { allowSelfDelete: true });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 },
      );
    }

    // 成功后，客户端应该登出并重定向
    return NextResponse.json(
      {
        success: true,
        message: "账号已注销",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API] Self delete user error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
