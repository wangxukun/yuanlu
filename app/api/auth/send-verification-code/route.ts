// /api/auth/send-verification-code.ts
import prisma from "@/lib/prisma";
import { generateRandomCode } from "@/lib/tools";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// 创建SMTP传输器
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_FROM_ADDRESS, // 发件人邮箱
    pass: process.env.SMTP_PASS, // 发件人邮箱授权码
  },
});

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  console.log("是否连接到我的邮件发送客户端：", await transporter.verify());
  try {
    // 生成6位数字验证码
    const verificationCode = generateRandomCode(6);
    const expiresAt = new Date(Date.now() + 300000); // 5分钟后过期

    // 使用Prisma保存验证码
    await prisma.verification_code.upsert({
      where: { email },
      update: { code: verificationCode, expiresAt },
      create: { email, code: verificationCode, expiresAt },
    });

    // 实际发送邮件逻辑（示例使用console.log）
    // 配置邮件内容
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "您的注册验证码",
      text: `您的验证码是：${verificationCode}，该验证码5分钟内有效`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">欢迎注册我们的服务</h2>
          <p>您的验证码是：</p>
          <div style="font-size: 24px; font-weight: bold; color: #2563eb; margin: 20px 0;">
            ${verificationCode}
          </div>
          <p style="color: #6b7280;">该验证码将在5分钟后失效，请尽快完成注册。</p>
        </div>
      `,
    };

    // 发送邮件
    const info = await transporter.sendMail(mailOptions);
    console.log(`邮件已发送至 ${email}，Message ID: ${info.messageId}`);

    return NextResponse.json({
      success: true,
      message: "验证码已发送",
      status: 200,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `验证码发送失败:${error}`,
      status: 500,
    });
  }
}
