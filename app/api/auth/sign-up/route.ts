import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // 检查email是否已存在
    const userExists = await prisma.user.findFirst({
      where: { email },
    });

    if (userExists) {
      return NextResponse.json({
        success: false,
        message: "电子邮箱已被注册",
        status: 400,
      });
    }

    // 对密码进行哈希处理
    const saltRounds = 10; // 哈希盐的轮数，值越大越安全但越慢
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 创建新用户
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword, // 存储哈希后的密码
      },
    });

    return NextResponse.json({
      errors: null,
      success: true,
      message: "用户注册成功",
      status: 200,
    });
  } catch (error) {
    console.error("用户注册时出错:", error);
    return NextResponse.json({
      success: false,
      message: "服务器内部错误",
      status: 500,
    });
  }
}
