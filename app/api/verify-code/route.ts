// app/api/verify-code/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function POST(request: Request) {
  const { phone, code } = await request.json();

  if (!phone || !code) {
    return NextResponse.json(
      { success: false, message: "手机号和验证码不能为空" },
      { status: 400 },
    );
  }

  try {
    // 查询验证码
    const smsCode = await prisma.smsCode.findFirst({
      where: {
        phone,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // 5 分钟内有效
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!smsCode) {
      return NextResponse.json(
        { success: false, message: "验证码已过期或不存在" },
        { status: 400 },
      );
    }

    if (smsCode.code !== code) {
      return NextResponse.json(
        { success: false, message: "验证码错误" },
        { status: 400 },
      );
    }

    // 验证通过后删除验证码
    await prisma.smsCode.deleteMany({
      where: { phone },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("验证码校验错误:", error);
    return NextResponse.json(
      { success: false, message: error.message || "服务器内部错误" },
      { status: 500 },
    );
  }
}
