// lib/formSchema.ts
import { z } from "zod";

export const registerFormSchema = z.object({
  phone: z.string().regex(/^1[3456789]\d{9}$/, "请输入有效的手机号码"),
  password: z
    .string()
    .min(8, "密码必须至少8位")
    .max(16, "密码不能超过16位")
    .regex(
      /^(?:(?=.*\d)(?=.*[A-Za-z])|(?=.*\d)(?=.*[@$!%*#-_?&])|(?=.*[A-Za-z])(?=.*[@$!%*#-_?&]))[A-Za-z\d@$!%*#-_?&]{8,16}$/,
      "密码必须包含数字、字母和符号中的至少两种",
    ),

  auth_code: z.string().min(6, "短信验证码必须6位"),
  isAgree: z.boolean().refine((val) => val, {
    message: "必须同意用户协议和隐私政策",
  }),
});

// 密码验证函数（复用之前的实现）
const validatePassword = (password: string): boolean => {
  if (password.length < 8 || password.length > 16) return false;

  let hasNumber = false;
  let hasLetter = false;
  let hasSymbol = false;

  for (const char of password) {
    if (/[0-9]/.test(char)) hasNumber = true;
    else if (/[a-zA-Z]/.test(char)) hasLetter = true;
    else hasSymbol = true;

    if (hasNumber && hasLetter && hasSymbol) break;
  }

  return (hasNumber ? 1 : 0) + (hasLetter ? 1 : 0) + (hasSymbol ? 1 : 0) >= 2;
};

// 登录表单验证 Schema
export const signInSchema = z.object({
  email: z
    .string()
    .min(1, { message: "邮箱不能为空" })
    .email({ message: "请输入有效的邮箱地址" }),
  password: z
    .string()
    .min(1, { message: "密码不能为空" })
    .refine(validatePassword, {
      message: "密码必须为8~16位，且包含数字、字母、符号中的至少两种",
    }),
});

// 联系我们表单验证 Schema
export const contactSchema = z.object({
  email: z
    .string()
    .min(1, { message: "邮箱不能为空" })
    .email({ message: "请输入有效的邮箱地址" }),
  subject: z
    .string()
    .min(1, { message: "主题不能为空" })
    .max(50, { message: "主题不能超过50个字符" }), // 增加一个最大长度限制
  message: z
    .string()
    .min(10, { message: "留言内容至少需要10个字符" })
    .max(1000, { message: "留言内容不能超过1000个字符" }),
});

export type ContactFormValues = z.infer<typeof contactSchema>;

// 导出类型
export type SignInFormValues = z.infer<typeof signInSchema>;
