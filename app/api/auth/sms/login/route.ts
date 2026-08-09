import { NextRequest, NextResponse } from 'next/server';
import { SmsAuthService } from '@/core/auth/sms-auth.service';
import { PhoneLoginDTO } from '@/core/auth/sms-auth.dto';

export async function POST(request: NextRequest) {
  try {
    const body: PhoneLoginDTO = await request.json();

    if (!body.phone || !body.code) {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 },
      );
    }

    const user = await SmsAuthService.phoneLogin(body);

    // TODO: 为移动端签发 JWT Token，Web端主要由 NextAuth Credentials 拦截处理
    return NextResponse.json({
      success: true,
      data: {
        userid: user.userid,
        phone: user.phone,
        // token: '...', 
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '登录失败' },
      { status: 400 },
    );
  }
}
