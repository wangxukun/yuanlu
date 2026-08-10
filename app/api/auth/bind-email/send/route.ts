import { NextRequest, NextResponse } from "next/server";
import { BindEmailService } from "@/core/auth/bind-email.service";
import { auth } from "@/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.userid) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "邮箱不能为空" },
        { status: 400 },
      );
    }

    const result = await BindEmailService.sendBindEmailCode(
      email,
      session.user.userid,
    );

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("[BindEmailSendAPI] Error:", error);
    const message =
      error instanceof Error ? error.message : "发送验证码失败，请重试";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }
}
