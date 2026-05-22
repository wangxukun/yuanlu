// core/auth/forgot-password.service.ts
import prisma from "@/lib/prisma";
import { generateRandomCode } from "@/lib/tools";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import type {
  SendResetCodeRequestDto,
  ResetPasswordRequestDto,
} from "./forgot-password.dto";

// Initialize the nodemailer transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_FROM_ADDRESS, // Sender email address
    pass: process.env.SMTP_PASS, // Auth code
  },
});

/**
 * Send password reset verification code to the target email address.
 * Validates whether user exists before spending resources.
 */
export async function sendResetPasswordCode(
  dto: SendResetCodeRequestDto,
): Promise<{ success: boolean; message: string }> {
  const { email } = dto;

  if (!email) {
    throw new Error("Email address is required");
  }

  // 1. Verify user exists in the system
  const userExists = await prisma.user.findUnique({
    where: { email },
  });

  if (!userExists) {
    throw new Error("该邮箱尚未注册");
  }

  // 2. Generate 6-digit numeric verification code
  const verificationCode = generateRandomCode(6);
  const expiresAt = new Date(Date.now() + 300000); // 5 minutes expiration

  // 3. Persist the verification code
  await prisma.verification_code.upsert({
    where: { email },
    update: { code: verificationCode, expiresAt },
    create: { email, code: verificationCode, expiresAt },
  });

  // 4. Configure email content
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "远路播客 - 密码重置验证",
    text: `您的验证码是：${verificationCode}，该验证码5分钟内有效。若非本人操作，请忽略此邮件。`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
        <h2 style="color: #2563eb; margin-top: 0; margin-bottom: 20px; font-size: 22px; font-weight: bold; border-bottom: 2px solid #eff6ff; padding-bottom: 12px;">远路播客密码重置</h2>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">我们收到了您重置密码的请求。您的验证码是：</p>
        <div style="font-size: 32px; font-weight: bold; color: #2563eb; margin: 24px 0; letter-spacing: 6px; text-align: center; background-color: #f0f9ff; padding: 15px; border-radius: 12px; border: 1px dashed #bee3f8;">
          ${verificationCode}
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">该验证码将在 <strong>5 分钟</strong> 后失效，请尽快在页面中完成重置。</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin-bottom: 0;">如果您没有请求重置密码，请忽略此邮件，您的账户依然安全。</p>
      </div>
    `,
  };

  // 5. Send email via SMTP client
  await transporter.sendMail(mailOptions);

  return {
    success: true,
    message: "Verification code sent successfully",
  };
}

/**
 * Validate reset code and change user password.
 */
export async function resetPassword(
  dto: ResetPasswordRequestDto,
): Promise<{ success: boolean; message: string }> {
  const { email, code, password } = dto;

  if (!email || !code || !password) {
    throw new Error("Email, code and new password are required");
  }

  // 1. Fetch the verification code record
  const record = await prisma.verification_code.findUnique({
    where: { email },
  });

  if (!record || record.code !== code) {
    throw new Error("验证码错误");
  }

  // 2. Validate expiration date
  if (new Date() > record.expiresAt) {
    throw new Error("验证码已过期");
  }

  // 3. Hash the new password with bcryptjs
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // 4. Update the user password in database
  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  // 5. Delete the verification record to prevent re-use
  await prisma.verification_code.delete({
    where: { email },
  });

  return {
    success: true,
    message: "Password reset completed successfully",
  };
}
