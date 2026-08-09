import { NextRequest, NextResponse } from 'next/server';
import { SmsAuthService } from '@/core/auth/sms-auth.service';
import { VerifySmsCodeDTO } from '@/core/auth/sms-auth.dto';

export async function POST(request: NextRequest) {
  try {
    const body: VerifySmsCodeDTO = await request.json();

    if (!body.phone || !body.code || !body.scene) {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 },
      );
    }

    const isValid = await SmsAuthService.verifySmsCode(body);

    if (isValid) {
      return NextResponse.json({ success: true, data: { verified: true } });
    } else {
      return NextResponse.json(
        { success: false, error: '验证码错误或已失效' },
        { status: 400 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '验证失败' },
      { status: 500 },
    );
  }
}
