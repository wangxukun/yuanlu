// core/auth/forgot-password.dto.ts

export interface SendResetCodeRequestDto {
  email: string;
}

export interface ResetPasswordRequestDto {
  email: string;
  code: string;
  password: string; // The new password to be updated
}

export interface PhoneResetPasswordRequestDto {
  phone: string;
  code: string;
  password: string;
}
