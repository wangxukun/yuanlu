import { NextRequest, NextResponse } from "next/server";
import { resetPassword } from "@/core/auth/forgot-password.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, password } = body;

    if (!email || !code || !password) {
      return NextResponse.json(
        { success: false, error: "邮箱、验证码及新密码不能为空" },
        { status: 400 },
      );
    }

    const result = await resetPassword({ email, code, password });

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("[ForgotPasswordResetAPI] Error resetting password:", error);
    const message =
      error instanceof Error ? error.message : "重置密码失败，请重试";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }
}
