import { NextRequest, NextResponse } from "next/server";
import { BindEmailService } from "@/core/auth/bind-email.service";
import { requireAuth } from "@/core/auth/guard";

export async function POST(request: NextRequest) {
  try {
    // requireAuth：Web Cookie 优先，移动端 Bearer Token 兜底（Android 端依赖）
    const guard = await requireAuth();
    if (!guard.ok) {
      return guard.response;
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
      guard.session.user.userid!,
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
