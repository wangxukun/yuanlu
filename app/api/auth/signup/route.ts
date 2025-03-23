import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(request: Request) {
  try {
    const { phone, password } = await request.json();

    // 检查手机号是否已存在
    const userExists = await prisma.user.findFirst({
      where: { phone },
    });

    if (userExists) {
      return NextResponse.json(
        { success: false, message: "手机号已存在" },
        { status: 400 },
      );
    }

    // 对密码进行哈希处理
    const saltRounds = 10; // 哈希盐的轮数，值越大越安全但越慢
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 创建新用户
    const newUser = await prisma.user.create({
      data: {
        phone,
        password: hashedPassword, // 存储哈希后的密码
        role: "user",
        languagePreference: "zh-CN",
        createAt: new Date(),
      },
    });

    return NextResponse.json(
      { success: true, message: "用户注册成功", data: newUser },
      { status: 201 },
    );
  } catch (error) {
    console.error("用户注册时出错:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 },
    );
  }
}
