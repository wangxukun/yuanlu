import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";

// 定义表单验证 schema
const contactSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  subject: z.string().min(1, "请输入主题"),
  message: z.string().min(10, "内容至少需要10个字符"),
});

// 复用现有的邮件发送配置
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_FROM_ADDRESS,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证数据
    const result = contactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "输入数据格式有误",
          errors: result.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { email, subject, message } = result.data;

    // 配置邮件内容
    // 注意：这里发件人是系统配置的邮箱，但 Reply-To 设置为用户的邮箱
    // 这样你收到邮件点击回复时，可以直接回复给用户
    const mailOptions = {
      from: process.env.EMAIL_FROM_ADDRESS, // 必须与 auth.user 一致
      to: "wxk-zd@qq.com", // 你的接收邮箱
      replyTo: email, // 用户的邮箱
      subject: `[网站留言] ${subject}`,
      text: `来自: ${email}\n\n内容:\n${message}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #2563eb; border-bottom: 1px solid #eee; padding-bottom: 10px;">新留言通知</h2>
          <p><strong>用户邮箱：</strong> ${email}</p>
          <p><strong>主题：</strong> ${subject}</p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 4px; margin-top: 15px;">
            <p style="margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            此邮件由系统自动发送，直接回复即可联系该用户。
          </p>
        </div>
      `,
    };

    // 发送邮件
    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: "邮件发送成功",
    });
  } catch (error) {
    console.error("Contact email error:", error);
    return NextResponse.json(
      { success: false, message: "发送失败，请稍后重试" },
      { status: 500 },
    );
  }
}
