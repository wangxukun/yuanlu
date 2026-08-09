import { NextRequest, NextResponse } from 'next/server';
import { CaptchaClient } from '@/core/auth/captcha.client';
import { CaptchaValidateData } from '@/core/auth/sms-auth.dto';

export async function POST(request: NextRequest) {
  try {
    const body: CaptchaValidateData = await request.json();

    if (!body.lotNumber || !body.captchaOutput || !body.passToken || !body.genTime) {
      return NextResponse.json(
        { success: false, error: '验证参数不完整' },
        { status: 400 },
      );
    }

    const isValid = await CaptchaClient.validate(body);

    if (isValid) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: '验证失败' },
        { status: 400 },
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: '验证异常' },
      { status: 500 },
    );
  }
}
