// core/auth/sms-auth.service.ts
import {
  SendSmsCodeDTO,
  SmsSendResultDTO,
  VerifySmsCodeDTO,
  PhoneRegisterDTO,
  PhoneLoginDTO,
  BindPhoneDTO,
} from "./sms-auth.dto";
import { RateLimiterService } from "./rate-limiter.service";
import { CaptchaClient } from "./captcha.client";
import { AliyunSmsClient } from "./aliyun-sms.client";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export class SmsAuthService {
  /**
   * 获取场景对应的模板CODE
   */
  private static getTemplateCode(scene: string): string {
    switch (scene) {
      case "REGISTER":
      case "LOGIN":
        return process.env.ALIYUN_SMS_TEMPLATE_LOGIN_REGISTER!;
      case "CHANGE_PHONE":
        return process.env.ALIYUN_SMS_TEMPLATE_CHANGE_PHONE!;
      case "RESET_PASSWORD":
        return process.env.ALIYUN_SMS_TEMPLATE_RESET_PASSWORD!;
      case "BIND":
        return process.env.ALIYUN_SMS_TEMPLATE_BIND_PHONE!;
      default:
        throw new Error("无效的短信场景");
    }
  }

  /**
   * 发送短信验证码
   */
  public static async sendSmsCode(
    dto: SendSmsCodeDTO,
    clientIp: string,
  ): Promise<SmsSendResultDTO> {
    // 1. 检查频控（渐进式防刷）
    const rateLimit = await RateLimiterService.checkSmsSendRateLimit(
      dto.phone,
      clientIp,
    );

    if (!rateLimit.allowed) {
      return {
        success: false,
        code: "RATE_LIMITED",
        error:
          rateLimit.reason === "RATE_LIMITED_60S"
            ? "请求过于频繁，请60秒后再试"
            : "请求超过限制，请稍后再试",
      };
    }

    // 2. 检查是否需要图形验证码
    if (rateLimit.requireCaptcha) {
      if (!dto.captchaData) {
        return {
          success: false,
          requireCaptcha: true,
          code: "CAPTCHA_REQUIRED",
        };
      }

      // 如果提供了图形验证码数据，则进行二次校验
      const isValid = await CaptchaClient.validate(dto.captchaData);
      if (!isValid) {
        return {
          success: false,
          requireCaptcha: true, // 验证失败，要求重新验证
          error: "图形验证失败，请重试",
        };
      }
    }

    // 3. 发送短信
    const templateCode = this.getTemplateCode(dto.scene);
    const sendSuccess = await AliyunSmsClient.sendSmsVerifyCode(
      dto.phone,
      templateCode,
    );

    if (sendSuccess) {
      // 发送成功，记录 redis
      await RateLimiterService.recordSmsSend(dto.phone, clientIp);
      return { success: true };
    } else {
      return { success: false, code: "SEND_FAILED", error: "短信发送失败" };
    }
  }

  /**
   * 校验短信验证码
   */
  public static async verifySmsCode(dto: VerifySmsCodeDTO): Promise<boolean> {
    // 检查暴力破解
    const canAttempt = await RateLimiterService.checkVerifyAttemptLimit(
      dto.phone,
    );
    if (!canAttempt) {
      throw new Error("验证失败次数过多，请30分钟后再试");
    }

    const isValid = await AliyunSmsClient.checkSmsVerifyCode(
      dto.phone,
      dto.code,
    );

    if (isValid) {
      await RateLimiterService.resetVerifyFailCount(dto.phone);
      return true;
    } else {
      await RateLimiterService.incrementVerifyFailCount(dto.phone);
      return false;
    }
  }

  /**
   * 手机号注册
   */
  public static async phoneRegister(dto: PhoneRegisterDTO, clientIp: string) {
    const isValid = await this.verifySmsCode({
      phone: dto.phone,
      code: dto.code,
      scene: "REGISTER",
    });

    if (!isValid) {
      throw new Error("验证码错误或已失效");
    }

    const existingUser = await prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existingUser) {
      throw new Error("该手机号已注册");
    }

    // 处理密码
    let hashedPassword = null;
    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }

    // 生成一个虚拟的 email 以绕过当前 schema 的约束，或者如果 schema 中 email 可以不填，则忽略
    // 因为 user 模型中 email 是 unique 的并且不是 optional，所以在未绑定 email 时可以生成伪 email。
    const tempEmail = `${dto.phone}@placeholder.yuanlu.com`;

    const newUser = await prisma.user.create({
      data: {
        phone: dto.phone,
        email: tempEmail, // TODO: 需结合实际业务考虑，未来绑定邮箱时更新此字段
        password: hashedPassword,
        registerIp: clientIp,
      },
    });

    return newUser;
  }

  /**
   * 手机号登录 (只处理逻辑，最终结合 NextAuth 使用)
   */
  public static async phoneLogin(dto: PhoneLoginDTO) {
    const isValid = await this.verifySmsCode({
      phone: dto.phone,
      code: dto.code,
      scene: "LOGIN",
    });

    if (!isValid) {
      throw new Error("验证码错误或已失效");
    }

    const user = await prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      // 自动注册逻辑（可选）
      throw new Error("用户不存在，请先注册");
    }

    if (user.isLoginAllowed === false) {
      throw new Error("由于违反相关规定，您的账号已被禁止登录！");
    }

    return user;
  }

  /**
   * 绑定手机号（针对已登录用户）
   */
  public static async bindPhone(userid: string, dto: BindPhoneDTO) {
    const isValid = await this.verifySmsCode({
      phone: dto.phone,
      code: dto.code,
      scene: "BIND",
    });

    if (!isValid) {
      throw new Error("验证码错误或已失效");
    }

    // 检查碰撞
    const existingUser = await prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existingUser) {
      if (existingUser.userid === userid) {
        throw new Error("您已经绑定了该手机号");
      }
      throw new Error("该手机号已被其他账号绑定");
    }

    await prisma.user.update({
      where: { userid },
      data: { phone: dto.phone, phoneVerified: true },
    });

    return true;
  }

  /**
   * 手机号重置密码
   */
  public static async resetPasswordByPhone(dto: {
    phone: string;
    code: string;
    password: string;
  }) {
    const isValid = await this.verifySmsCode({
      phone: dto.phone,
      code: dto.code,
      scene: "RESET_PASSWORD",
    });

    if (!isValid) {
      throw new Error("验证码错误或已失效");
    }

    const user = await prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      throw new Error("该手机号尚未注册");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await prisma.user.update({
      where: { userid: user.userid },
      data: { password: hashedPassword },
    });

    return { success: true, message: "密码重置成功" };
  }
}
