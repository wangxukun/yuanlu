// pages/api/auth/verify-code.ts
import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();
    console.log("Email:", email);
    console.log("Code:", code);
    const record = await prisma.verification_code.findUnique({
      where: { email },
    });

    if (!record || record.code !== code) {
      return NextResponse.json({
        success: false,
        message: "验证码错误",
        status: 400,
      });
    }

    if (new Date() > record.expiresAt) {
      return NextResponse.json({
        success: false,
        message: "验证码已过期",
        status: 400,
      });
    }

    return NextResponse.json({
      success: true,
      message: "验证成功",
      status: 200,
    });
    // res.status(200).json({ valid: true });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `验证失败:${error}`,
      status: 500,
    });
  }
}
