// app/api/auth/mobile/token/route.ts
// Dedicated mobile token endpoint supporting both phone+code and email+password login.
// Returns a mobile JWT token on successful authentication.

import { NextRequest, NextResponse } from "next/server";
import { SmsAuthService } from "@/core/auth/sms-auth.service";
import { signMobileToken } from "@/core/auth/mobile-token.service";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

interface MobileLoginRequest {
  // Phone + SMS code login
  phone?: string;
  code?: string;
  // Email + password login
  email?: string;
  password?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: MobileLoginRequest = await request.json();

    // Determine login method
    const isPhoneLogin = body.phone && body.code;
    const isEmailLogin = body.email && body.password;

    if (!isPhoneLogin && !isEmailLogin) {
      return NextResponse.json(
        {
          success: false,
          error: "请提供手机号+验证码或邮箱+密码",
        },
        { status: 400 },
      );
    }

    let user;

    if (isPhoneLogin) {
      // ── Phone + SMS Code Login ──

      // Verify SMS code (reuses existing rate-limiting and brute-force protection)
      const isValid = await SmsAuthService.verifySmsCode({
        phone: body.phone!,
        code: body.code!,
        scene: "LOGIN",
      });

      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "验证码错误或已失效" },
          { status: 400 },
        );
      }

      // Find or auto-register user
      user = await prisma.user.findUnique({
        where: { phone: body.phone },
        include: {
          user_profile: {
            select: { nickname: true, avatarFileName: true },
          },
        },
      });

      if (!user) {
        // Auto-register: aligned with Web's NextAuth authorize flow
        const clientIp =
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "Unknown";

        user = await prisma.user.create({
          data: {
            phone: body.phone!,
            email: `${body.phone}@placeholder.yuanlu.com`,
            registerIp: clientIp,
            user_profile: {
              create: {
                nickname: `用户_${body.phone!.slice(-4)}`,
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
    } else {
      // ── Email + Password Login ──

      user = await prisma.user.findUnique({
        where: { email: body.email },
        include: {
          user_profile: {
            select: { nickname: true, avatarFileName: true },
          },
        },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: "邮箱或密码错误" },
          { status: 401 },
        );
      }

      if (!user.password) {
        return NextResponse.json(
          { success: false, error: "该账号尚未设置密码，请使用验证码登录" },
          { status: 400 },
        );
      }

      const isPasswordValid = await bcrypt.compare(
        body.password!,
        user.password,
      );
      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, error: "邮箱或密码错误" },
          { status: 401 },
        );
      }
    }

    // ── Common post-auth logic ──

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
    console.error("Mobile token login error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "登录失败",
      },
      { status: 400 },
    );
  }
}
