"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { registerFormSchema } from "@/app/lib/form-schema";

export type State = {
  errors?: {
    phone?: string[]; // 保存多段验证未通过的提示信息，如‘手机号格式不正确’，‘手机号已存在’
    auth_code?: string[];
    password?: string[]; // 保存多段验证未通过的提示信息，如‘密码必须至少8位’，‘密码必须包含数字、字母和符号中的至少两种’
    isAgree: string[];
  };
  message?: string | null;
};

// 表单校验（zod schema）
const UserRegister = registerFormSchema;

export async function userRegister(prevState: State, formData: FormData) {
  const rawFormData = {
    phone: formData.get("phone") as string,
    auth_code: formData.get("auth_code") as string,
    password: formData.get("password") as string,
    isAgree: formData.get("agree") === "on",
  };
  const validatedFields = UserRegister.safeParse(rawFormData);
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "用户注册失败",
    };
  }
  const { phone, auth_code, password } = validatedFields.data;
  // 验证短信验证码
  if (await isSmsVerified(phone, auth_code)) {
    // 调用注册 API
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        errors: {
          phone: [data.message || "注册失败"],
        },
        message: "用户注册失败",
      };
    }
    // 注册成功后，重定向到 /auth/register-success 页面
    // 更新成功后，刷新缓存并重定向到 /auth/login 页面
    revalidatePath("/auth/register");
    redirect("/auth/register-success");
  } else {
    return {
      errors: {
        auth_code: ["短信验证码错误"],
      },
    };
  }
}

/**
 * 验证短信验证码
 * @param phone
 * @param auth_code
 */
export const isSmsVerified = async (phone: string, auth_code: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/auth/sms/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, auth_code }),
  });

  return res.ok;
};

// 定义检查手机号是否已存在的函数
// export const checkPhoneExists = async (phone: string): Promise<boolean> => {
//   const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
//   const res = await fetch(`${baseUrl}/api/auth/check-phone-exists`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ phone }),
//   });
//   if (res.ok) {
//     const data = await res.json();
//     return data.exists; // 假设返回的 JSON 对象包含一个 `exists` 字段
//   } else {
//     return false;
//   }
// };

export async function login(formData: FormData) {
  const rawFormData = {
    phone: formData.get("phone"),
    authCode: formData.get("password"),
  };
  console.log(rawFormData);
}
