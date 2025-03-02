import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function POST(request: Request) {
  const { phone } = await request.json();

  if (!phone) {
    return NextResponse.json(
      { success: false, message: "手机号不能为空" },
      { status: 400 },
    );
  }
  try {
    // 查询用户表中是否存在该手机号
    const user = await prisma.user.findFirst({
      where: {
        phone,
      },
    });
    console.log("user:", user);
    if (user) {
      return NextResponse.json(
        { success: true, exists: true },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        { success: true, exists: false },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error("检查手机号是否存在时出错:", error);
    return NextResponse.json(
      { success: false, message: error.message || "服务器内部错误" },
      { status: 500 },
    );
  }
}
