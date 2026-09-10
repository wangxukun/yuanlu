import { NextRequest, NextResponse } from "next/server";
import { SmsAuthService } from "@/core/auth/sms-auth.service";
import { BindPhoneDTO } from "@/core/auth/sms-auth.dto";
import { requireAuth } from "@/core/auth/guard";

export async function POST(request: NextRequest) {
  try {
    // requireAuth：Web Cookie 优先，移动端 Bearer Token 兜底（Android 端依赖）
    const guard = await requireAuth();
    if (!guard.ok) {
      return guard.response;
    }

    const body: BindPhoneDTO = await request.json();

    if (!body.phone || !body.code) {
      return NextResponse.json(
        { success: false, error: "参数不完整" },
        { status: 400 },
      );
    }

    await SmsAuthService.bindPhone(guard.session.user.userid!, body);

    return NextResponse.json({ success: true, message: "绑定成功" });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "绑定失败",
      },
      { status: 400 },
    );
  }
}
