// app/api/verify-code/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function POST(request: Request) {
  const { phone, auth_code } = await request.json();

  if (!phone || !auth_code) {
    return NextResponse.json(
      { success: false, message: "手机号和验证码不能为空" },
      { status: 400 },
    );
  }

  try {
    // 查询验证码
    const table_sms_code = await prisma.sms_code.findFirst({
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

    console.log("table_sms_code:", table_sms_code);
    if (!table_sms_code) {
      return NextResponse.json(
        { success: false, message: "验证码已过期或不存在" },
        { status: 400 },
      );
    }

    if (table_sms_code.code !== auth_code) {
      return NextResponse.json(
        { success: false, message: "验证码错误" },
        { status: 400 },
      );
    }

    // 验证通过后删除验证码
    await prisma.sms_code.deleteMany({
      where: { phone },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("验证码校验错误:", error);

    let errorMessage = "服务器内部错误";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 },
    );
  }
}
