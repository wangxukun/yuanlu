import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function PUT(request: NextRequest) {
  try {
    // 解析请求体获取 userid
    const { userid, role, isCommentAllowed } = await request.json();

    console.log("Received request:", { userid, role, isCommentAllowed });

    // 验证参数有效性
    if (!userid) {
      console.error("Invalid user ID", userid);
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // 执行删除操作
    const updateUser = await prisma.user.update({
      where: {
        userid: userid,
      },
      data: {
        role: role,
        isCommentAllowed: isCommentAllowed,
      },
    });

    return NextResponse.json(
      { message: "User updated successfully", user: updateUser },
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
