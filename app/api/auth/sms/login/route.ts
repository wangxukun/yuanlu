import { NextRequest, NextResponse } from "next/server";
import { SmsAuthService } from "@/core/auth/sms-auth.service";
import { PhoneLoginDTO } from "@/core/auth/sms-auth.dto";
import { signMobileToken } from "@/core/auth/mobile-token.service";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body: PhoneLoginDTO = await request.json();

    if (!body.phone || !body.code) {
      return NextResponse.json(
        { success: false, error: "参数不完整" },
        { status: 400 },
      );
    }

    // Verify SMS code (reuses existing rate-limiting and verification logic)
    const isValid = await SmsAuthService.verifySmsCode({
      phone: body.phone,
      code: body.code,
      scene: "LOGIN",
    });

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "验证码错误或已失效" },
        { status: 400 },
      );
    }

    // Find existing user or auto-register (aligned with Web's NextAuth authorize flow)
    let user = await prisma.user.findUnique({
      where: { phone: body.phone },
      include: {
        user_profile: {
          select: { nickname: true, avatarFileName: true },
        },
      },
    });

    if (!user) {
      // Auto-register: create new user with phone number
      const clientIp =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "Unknown";

      user = await prisma.user.create({
        data: {
          phone: body.phone,
          email: `${body.phone}@placeholder.yuanlu.com`,
          registerIp: clientIp,
          user_profile: {
            create: {
              nickname: `用户_${body.phone.slice(-4)}`,
            },
          },
        },
        include: {
          user_profile: {
            select: { nickname: true, avatarFileName: true },
          },
        },
      });
    }

    // Check login restriction
    if (user.isLoginAllowed === false) {
      return NextResponse.json(
        { success: false, error: "由于违反相关规定，您的账号已被禁止登录！" },
        { status: 403 },
      );
    }

    // Increment loginCount and mark online
    await prisma.user.update({
      where: { userid: user.userid },
      data: {
        isOnline: true,
        lastActiveAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

    // Sign mobile JWT token
    const { token, expiresAt } = await signMobileToken({
      userid: user.userid,
      email: user.email,
      phone: user.phone,
      role: user.role || "USER",
      nickname: user.user_profile?.nickname || null,
      avatarFileName: user.user_profile?.avatarFileName || null,
    });

    return NextResponse.json({
      success: true,
      data: {
        userid: user.userid,
        phone: user.phone,
        email: user.email,
        role: user.role || "USER",
        nickname: user.user_profile?.nickname || null,
        token,
        expiresAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "登录失败",
      },
      { status: 400 },
    );
  }
}
