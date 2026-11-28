import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeSignupSource } from "@/core/utils/signup-source";
import bcrypt from "bcryptjs";

const VERIFIED_CODE_PREFIX = "VERIFIED:";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const signupSource = body?.signupSource;
    const inlineCode = typeof body?.code === "string" ? body.code.trim() : "";

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        message: "请提供有效的邮箱与密码",
        status: 400,
      });
    }

    // 获取注册IP地址（支持反向代理）
    const forwardedFor = request.headers.get("x-forwarded-for");
    const registerIp = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : request.headers.get("x-real-ip") || "unknown";

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

    // [B6] 核验该邮箱已通过 verify-code 校验（或随请求携带有效未过期验证码），禁止跳过验证码直接建号
    const verification = await prisma.verification_code.findUnique({
      where: { email },
    });
    const isValidProof =
      verification !== null &&
      new Date() <= verification.expiresAt &&
      (verification.code.startsWith(VERIFIED_CODE_PREFIX) ||
        (inlineCode.length > 0 &&
          !inlineCode.startsWith(VERIFIED_CODE_PREFIX) &&
          verification.code === inlineCode));

    if (!isValidProof) {
      return NextResponse.json({
        success: false,
        message: "请先完成邮箱验证码校验或验证码已过期",
        status: 400,
      });
    }

    // 对密码进行哈希处理
    const saltRounds = 10; // 哈希盐的轮数，值越大越安全但越慢
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 事务内建号并一次性消费验证码记录，杜绝重复使用
    await prisma.$transaction([
      prisma.user.create({
        data: {
          email,
          password: hashedPassword, // 存储哈希后的密码
          registerIp,
          signupSource: normalizeSignupSource(signupSource),
        },
      }),
      prisma.verification_code.deleteMany({
        where: { email },
      }),
    ]);

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
