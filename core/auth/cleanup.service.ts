import prisma from "@/lib/prisma";

/**
 * 批量清理过期的认证相关数据，防止脏数据堆积。
 * 包括：
 * - 过期的图形验证码 (captcha)
 * - 过期的邮箱验证码 (verification_code)
 * - 超过 1 小时的短信验证码 (sms_code)
 */
export async function cleanupExpiredAuthData() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  try {
    // 1. 清理过期的图形验证码
    const deletedCaptchas = await prisma.captcha.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });

    // 2. 清理过期的邮箱验证码
    const deletedEmails = await prisma.verification_code.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });

    // 3. 清理过期的短信验证码（设定为1小时前的数据）
    const deletedSms = await prisma.sms_code.deleteMany({
      where: {
        createAt: { lt: oneHourAgo },
      },
    });

    const totalDeleted =
      deletedCaptchas.count + deletedEmails.count + deletedSms.count;
    if (totalDeleted > 0) {
      console.log(
        `[Auth Cleanup] 成功清理脏数据: 图形验证码 ${deletedCaptchas.count} 条, 邮箱验证码 ${deletedEmails.count} 条, 短信验证码 ${deletedSms.count} 条。`,
      );
    }
  } catch (error) {
    console.error("[Auth Cleanup] 清理过期数据时发生异常:", error);
  }
}
