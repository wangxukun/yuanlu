import { NextRequest, NextResponse } from "next/server";
import { sendResetPasswordCode } from "@/core/auth/forgot-password.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "邮箱不能为空" },
        { status: 400 },
      );
    }

    const result = await sendResetPasswordCode({ email });

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error(
      "[ForgotPasswordSendAPI] Error sending verification code:",
      error,
    );
    const message =
      error instanceof Error ? error.message : "发送验证码失败，请重试";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }
}
