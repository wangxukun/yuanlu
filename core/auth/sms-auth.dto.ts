// core/auth/sms-auth.dto.ts

export type SmsScene =
  | "REGISTER"
  | "LOGIN"
  | "BIND"
  | "CHANGE_PHONE"
  | "RESET_PASSWORD"
  | "BIND_EMAIL";

export interface CaptchaValidateData {
  lotNumber: string;
  captchaOutput: string;
  passToken: string;
  genTime: string;
}

export interface SendSmsCodeDTO {
  phone: string;
  scene: SmsScene;
  captchaData?: CaptchaValidateData;
}

export interface VerifySmsCodeDTO {
  phone: string;
  code: string;
  scene: SmsScene;
}

export interface PhoneRegisterDTO {
  phone: string;
  code: string;
  password?: string; // Optional since pure phone registration doesn't require password
}

export interface BindPhoneDTO {
  phone: string;
  code: string;
}

export interface ChangePhoneDTO {
  oldPhone: string;
  oldCode: string;
  newPhone: string;
  newCode: string;
}

export interface PhoneLoginDTO {
  phone: string;
  code: string;
}

export interface SmsSendResultDTO {
  success: boolean;
  requireCaptcha?: boolean;
  code?: "CAPTCHA_REQUIRED" | "RATE_LIMITED" | "SEND_FAILED";
  error?: string;
}

// 手机号用户绑定 Email
export interface BindEmailDTO {
  email: string;
  code: string; // Email verification code
  password: string; // Set password for Email login
}

// 手机号重置密码
export interface PhoneResetPasswordDTO {
  phone: string;
  code: string;
  password: string;
}
