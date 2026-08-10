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
    const { email, code, password } = body;

    if (!email || !code || !password) {
      return NextResponse.json(
        { success: false, error: "参数不完整" },
        { status: 400 },
      );
    }

    const result = await BindEmailService.bindEmail(session.user.userid, {
      email,
      code,
      password,
    });

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
