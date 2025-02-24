import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function POST(req: Request) {
  try {
    // 解析请求体
    const body = await req.json();
    const { captchaId, answer } = body;

    if (!captchaId || !answer) {
      return NextResponse.json(
        { error: "Missing captchaId or answer" },
        { status: 400 },
      );
    }

    // 查询验证码
    const captcha = await prisma.captcha.findUnique({
      where: { id: captchaId },
    });

    if (!captcha || captcha.expiresAt < new Date()) {
      return NextResponse.json({ error: "验证码已过期" }, { status: 400 });
    }

    if (captcha.answer !== answer) {
      return NextResponse.json({ error: "验证码错误" }, { status: 400 });
    }

    // 验证成功
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in verify captcha:", error);
    return NextResponse.json({ error: "验证码验证失败" }, { status: 500 });
  }
}
