import { NextRequest, NextResponse } from 'next/server';
import { SmsAuthService } from '@/core/auth/sms-auth.service';
import { BindPhoneDTO } from '@/core/auth/sms-auth.dto';
import { auth } from '@/auth'; // 假设 NextAuth 导出了 auth

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.userid) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 },
      );
    }

    const body: BindPhoneDTO = await request.json();

    if (!body.phone || !body.code) {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 },
      );
    }

    await SmsAuthService.bindPhone(session.user.userid, body);

    return NextResponse.json({ success: true, message: '绑定成功' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '绑定失败' },
      { status: 400 },
    );
  }
}
