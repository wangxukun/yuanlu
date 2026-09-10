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
    const { email, code, password } = body;

    if (!email || !code || !password) {
      return NextResponse.json(
        { success: false, error: "参数不完整" },
        { status: 400 },
      );
    }

    const result = await BindEmailService.bindEmail(
      guard.session.user.userid!,
      {
        email,
        code,
        password,
      },
    );

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("[BindEmailConfirmAPI] Error:", error);
    const message = error instanceof Error ? error.message : "绑定失败，请重试";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }
}
