import { NextRequest, NextResponse } from 'next/server';
import { SmsAuthService } from '@/core/auth/sms-auth.service';
import { SendSmsCodeDTO } from '@/core/auth/sms-auth.dto';

export async function POST(request: NextRequest) {
  try {
    const body: SendSmsCodeDTO = await request.json();

    if (!body.phone || !body.scene) {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 },
      );
    }

    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor
      ? forwardedFor.split(',')[0].trim()
      : request.headers.get('x-real-ip') || 'unknown';

    const result = await SmsAuthService.sendSmsCode(body, clientIp);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        {
          success: false,
          code: result.code,
          error: result.error,
          requireCaptcha: result.requireCaptcha,
        },
        { status: 200 }, // 返回 200，由前端根据 code 判断业务逻辑
      );
    }
  } catch (error: any) {
    console.error('Send SMS Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '内部服务器错误' },
      { status: 500 },
    );
  }
}
