// pages/api/auth/verify-code.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/** [B6] 验证码校验通过后的标记前缀与注册有效窗口（10 分钟） */
const VERIFIED_CODE_PREFIX = "VERIFIED:";
const VERIFIED_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!email || !code || code.startsWith(VERIFIED_CODE_PREFIX)) {
      return NextResponse.json({
        success: false,
        message: "验证码错误",
        status: 400,
      });
    }

    const record = await prisma.verification_code.findUnique({
      where: { email },
    });

    if (
      !record ||
      record.code.startsWith(VERIFIED_CODE_PREFIX) ||
      record.code !== code
    ) {
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

    // [B6] 标记为已验证并刷新 10 分钟注册窗口；无需改表结构，兼容全部既有客户端参数
    await prisma.verification_code.update({
      where: { email },
      data: {
        code: `${VERIFIED_CODE_PREFIX}${record.code}`,
        expiresAt: new Date(Date.now() + VERIFIED_WINDOW_MS),
      },
    });

    return NextResponse.json({
      success: true,
      message: "验证成功",
      status: 200,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `验证失败:${error}`,
      status: 500,
    });
  }
}
