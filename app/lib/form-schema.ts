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
