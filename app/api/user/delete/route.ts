import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
  try {
    // 1. 从 URL 查询参数中获取 id
    // URL 示例: /api/user/delete?id=cmjuubnk...
    const { searchParams } = new URL(request.url);
    const userid = searchParams.get("id");

    // 验证参数有效性
    if (!userid) {
      console.error("Invalid user ID", userid);
      return NextResponse.json({ error: "Invalid user ID", status: 400 });
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
