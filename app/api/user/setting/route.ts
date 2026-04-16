import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(request: NextRequest) {
  try {
    // 解析请求体获取 userid
    const { userid, role, isCommentAllowed, isLoginAllowed } =
      await request.json();

    console.log("Received request:", {
      userid,
      role,
      isCommentAllowed,
      isLoginAllowed,
    });

    // 验证参数有效性
    if (!userid) {
      console.error("Invalid user ID", userid);
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
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
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
