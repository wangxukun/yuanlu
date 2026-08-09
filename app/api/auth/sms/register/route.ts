import { NextRequest, NextResponse } from 'next/server';
import { SmsAuthService } from '@/core/auth/sms-auth.service';
import { PhoneRegisterDTO } from '@/core/auth/sms-auth.dto';

export async function POST(request: NextRequest) {
  try {
    const body: PhoneRegisterDTO = await request.json();

    if (!body.phone || !body.code) {
      return NextResponse.json(
        { success: false, message: '参数不完整' },
        { status: 400 },
      );
    }

    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor
      ? forwardedFor.split(',')[0].trim()
      : request.headers.get('x-real-ip') || 'unknown';

    const user = await SmsAuthService.phoneRegister(body, clientIp);

    return NextResponse.json({
      success: true,
      message: '用户注册成功',
      data: {
        userid: user.userid,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Phone Register Error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '注册失败' },
      { status: 400 },
    );
  }
}
