// core/auth/bind-email.service.ts
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { generateRandomCode } from "@/lib/tools";
import type { BindEmailDTO } from "./sms-auth.dto";

// Reuse the same SMTP transport as forgot-password.service.ts
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_FROM_ADDRESS,
    pass: process.env.SMTP_PASS,
  },
});

export class BindEmailService {
  /**
   * Send verification code to the target email for binding
   */
  public static async sendBindEmailCode(
    email: string,
    userid: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!email) {
      throw new Error("邮箱地址不能为空");
    }

    // Check if email is already taken by another real user (exclude placeholder emails)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.userid !== userid) {
      throw new Error("该邮箱已被其他账号使用");
    }

    // Generate 6-digit verification code
    const verificationCode = generateRandomCode(6);
    const expiresAt = new Date(Date.now() + 300000); // 5 minutes expiration

    // Persist the verification code (upsert to handle re-sends)
    await prisma.verification_code.upsert({
      where: { email },
      update: { code: verificationCode, expiresAt },
      create: { email, code: verificationCode, expiresAt },
    });

    // Send verification email
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "远路播客 - 绑定邮箱验证",
      text: `您的验证码是：${verificationCode}，该验证码5分钟内有效。若非本人操作，请忽略此邮件。`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #2563eb; margin-top: 0; margin-bottom: 20px; font-size: 22px; font-weight: bold; border-bottom: 2px solid #eff6ff; padding-bottom: 12px;">绑定邮箱验证</h2>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">您正在绑定邮箱至您的远路播客账号。您的验证码是：</p>
          <div style="font-size: 32px; font-weight: bold; color: #2563eb; margin: 24px 0; letter-spacing: 6px; text-align: center; background-color: #f0f9ff; padding: 15px; border-radius: 12px; border: 1px dashed #bee3f8;">
            ${verificationCode}
          </div>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">该验证码将在 <strong>5 分钟</strong> 后失效，请尽快完成绑定。</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin-bottom: 0;">如果您没有发起此操作，请忽略此邮件，您的账户依然安全。</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: "验证码已发送至邮箱",
    };
  }

  /**
   * Confirm email binding: verify code, update email + password, mark emailVerified
   */
  public static async bindEmail(
    userid: string,
    dto: BindEmailDTO,
  ): Promise<{ success: boolean; message: string }> {
    const { email, code, password } = dto;

    if (!email || !code || !password) {
      throw new Error("邮箱、验证码和密码不能为空");
    }

    // 1. Fetch and validate the verification code
    const record = await prisma.verification_code.findUnique({
      where: { email },
    });

    if (!record || record.code !== code) {
      throw new Error("验证码错误");
    }

    if (new Date() > record.expiresAt) {
      throw new Error("验证码已过期");
    }

    // 2. Check email collision (another user already has this email)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.userid !== userid) {
      throw new Error("该邮箱已被其他账号使用");
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Transaction: update user + delete verification code
    await prisma.$transaction([
      prisma.user.update({
        where: { userid },
        data: {
          email,
          password: hashedPassword,
          emailVerified: new Date(),
        },
      }),
      prisma.verification_code.delete({
        where: { email },
      }),
    ]);

    return {
      success: true,
      message: "邮箱绑定成功",
    };
  }
}
