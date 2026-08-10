import { NextRequest, NextResponse } from "next/server";
import { SmsAuthService } from "@/core/auth/sms-auth.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code, password } = body;

    if (!phone || !code || !password) {
      return NextResponse.json(
        { success: false, error: "手机号、验证码及新密码不能为空" },
        { status: 400 },
      );
    }

    const result = await SmsAuthService.resetPasswordByPhone({
      phone,
      code,
      password,
    });

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("[PhoneResetPasswordAPI] Error:", error);
    const message =
      error instanceof Error ? error.message : "重置密码失败，请重试";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }
}
