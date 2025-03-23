"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { registerFormSchema } from "@/app/lib/form-schema";
import { deleteObject, uploadToOSS } from "@/app/lib/oss";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
export type RegisterState = {
  errors?: {
    phone?: string[]; // 保存多段验证未通过的提示信息，如‘手机号格式不正确’，‘手机号已存在’
    auth_code?: string[];
    password?: string[]; // 保存多段验证未通过的提示信息，如‘密码必须至少8位’，‘密码必须包含数字、字母和符号中的至少两种’
    isAgree?: string[];
  };
  message?: string | null;
};

export type LoginState = {
  errors?: {
    phone?: string[];
    password?: string[];
  };
  message?: string | null;
};

export type PodcastState = {
  errors?: {
    podcastName: string;
    description: string;
    cover: string;
    coverFileName: string;
    form: string;
  };
  message?: string | null;
};

export type EpisodeState = {
  message?: string | null;
  status: number;
};

// 表单校验（zod schema）
const UserRegister = registerFormSchema;
const UserLogin = registerFormSchema.omit({ auth_code: true, isAgree: true });

/**
 * 用户注册
 * @param prevState
 * @param formData
 */
export async function userRegister(
  prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const rawFormData = {
    phone: formData.get("phone") as string,
    auth_code: formData.get("auth_code") as string,
    password: formData.get("password") as string,
    isAgree: formData.get("isAgree") === "on",
  };
  const validatedFields = UserRegister.safeParse(rawFormData);
  if (!validatedFields.success) {
    return new Promise((resolve) => {
      resolve({
        errors: validatedFields.error.flatten().fieldErrors,
        message: "用户注册失败",
      });
    });
    // return {
    //   errors: validatedFields.error.flatten().fieldErrors,
    //   message: "用户注册失败",
    // };
  }
  const { phone, auth_code, password } = validatedFields.data;
  // 验证短信验证码
  if (await isSmsVerified(phone, auth_code)) {
    // 调用注册 API
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return new Promise((resolve) => {
        resolve({
          errors: {
            phone: [data.message],
          },
          message: "用户注册失败",
        });
      });
    }
    // 注册成功后，重定向到 /auth/signup-success 页面
    // 更新成功后，刷新缓存并重定向到 /auth/login 页面
    revalidatePath("/auth/signup");
    redirect("/auth/register-success");
  } else {
    return new Promise((resolve) => {
      resolve({
        errors: {
          auth_code: ["短信验证码错误"],
        },
        message: "用户注册失败",
      });
    });
  }
}

/**
 * 验证短信验证码
 * @param phone
 * @param auth_code
 */
export const isSmsVerified = async (phone: string, auth_code: string) => {
  const res = await fetch(`${baseUrl}/api/auth/sms/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, auth_code }),
  });
  return res.ok;
};

/**
 * 用户登录
 * @param prevState
 * @param formData
 */
export async function login(
  prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const rawFormData = {
    phone: formData.get("phone"),
    password: formData.get("password"),
  };
  const validatedFields = UserLogin.safeParse(rawFormData);
  if (!validatedFields.success) {
    return new Promise((resolve) => {
      resolve({
        errors: validatedFields.error.flatten().fieldErrors,
        message: "用户登录失败",
      });
    });
  }
  const { phone, password } = validatedFields.data;
  // 调用注册 API
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    return new Promise((resolve) => {
      resolve({
        errors: {
          phone: [data.message || "登录失败"],
        },
        message: "用户登录失败",
      });
    });
  }
  // 注册成功后，重定向到 /auth/signup-success 页面
  // 更新成功后，刷新缓存并重定向到 /auth/login 页面
  revalidatePath("/auth/login");
  redirect("/");
}

/**
 * 创建播客
 * @param prevState
 * @param formData
 */
export async function createPodcast(
  prevState: PodcastState,
  formData: FormData,
): Promise<PodcastState> {
  try {
    // 1. 获取封面文件
    const coverFile = formData.get("cover") as File;
    if (!coverFile) {
      return new Promise((resolve) => {
        resolve({
          errors: {
            podcastName: "",
            description: "",
            cover: "请上传封面图片", // 使用已定义的 cover 字段
            coverFileName: "",
            form: "",
          },
          message: "缺少必要文件",
        });
      });
    }
    // 生成唯一的文件名
    const timestamp = Date.now();
    // 2. 转换为Buffer并生成唯一文件名
    const bytes = await coverFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uniqueFilename = `yuanlu/podcastes/covers/${timestamp}_${Math.random().toString(36).substring(2)}.${coverFile.name.split(".").pop()}`;
    // 3. 上传到OSS
    const { fileUrl: coverUrl } = await uploadToOSS(buffer, uniqueFilename);
    const res = await fetch(`${baseUrl}/api/podcast/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        podcastName: formData.get("podcastName"),
        description: formData.get("description"),
        coverUrl, // 使用OSS返回的URL
        coverFileName: uniqueFilename, // 存储在OSS中的文件名
        from: formData.get("from"),
      }),
    });
    // const data = await res.json();
    if (!res.ok) {
      return new Promise((resolve) => {
        resolve({
          message: "创建播客失败",
        });
      });
    }
    if (res.ok) {
      revalidatePath("/dashboard/podcasts/categories/create");
      // 先返回成功状态再执行重定向
      return {
        errors: {
          podcastName: "",
          description: "",
          cover: "",
          coverFileName: "",
          form: "",
        },
        // 在podcasts页面中，通过message判断是否需要重定向
        message: "redirect:/dashboard/podcasts/create-success", // 添加特殊标识
      };
    }
  } catch (error) {
    console.error("创建播客失败:", error);
    return new Promise((resolve) => {
      resolve({
        errors: {
          podcastName: "",
          description: "",
          cover: "上传封面失败", // 使用已定义的 cover 字段
          coverFileName: "",
          form: "",
        },
        message: "创建过程中发生错误",
      });
    });
  }
  // 添加默认返回（防御性编程）
  return {
    errors: {
      podcastName: "",
      description: "",
      cover: "",
      coverFileName: "",
      form: "",
    },
    message: "未知错误",
  };
}

export type PodcastDelState = {
  message?: string;
  status: number;
};
// 删除播客
export async function deletePodcast(
  id: number,
  coverFileName: string,
): Promise<PodcastDelState> {
  // 删除OSS中封面图片
  const result = await deleteObject(coverFileName);

  const res = await fetch(`${baseUrl}/api/podcast/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categoryid: id }),
  });
  const data = await res.json();
  console.log("删除OSS中封面图片", result);
  console.log("删除数据库中数据", res);
  if (!result || !res.ok) {
    return {
      message: "",
      status: 500,
    };
  }
  return {
    message: data.message,
    status: data.status,
  };
}

/**
 * 创建剧集
 * @param prevState
 * @param formData
 */
export async function createEpisode(
  prevState: EpisodeState,
  formData: FormData,
): Promise<EpisodeState> {
  const podcastId = formData.get("podcastid");
  const title = formData.get("episodeTitle");
  const cover = formData.get("cover") as File;
  const audio = formData.get("audio") as File;
  const duration = formData.get("duration");
  const subtitleEn = formData.get("subtitleEn") as File;
  const subtitleZh = formData.get("subtitleZh") as File;
  const status = formData.get("status");
  const isExclusive = formData.get("isExclusive");
  const description = formData.get("description");

  console.log(
    "创建剧集",
    podcastId,
    title,
    cover,
    audio,
    duration,
    subtitleEn,
    subtitleZh,
    status,
    isExclusive,
    description,
  );

  return new Promise((resolve) => {
    resolve({
      message: `创建剧集成功，请前往播客 ${podcastId}`,
      status: 200,
    });
  });
}
