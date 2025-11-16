"use server";

import { revalidatePath } from "next/cache";
import { registerFormSchema } from "@/app/lib/form-schema";
import { deleteObject } from "@/app/lib/oss";
import { auth } from "@/auth";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
export type RegisterState = {
  errors?: {
    phone?: string[]; // 保存多段验证未通过的提示信息，如‘手机号格式不正确’，‘手机号已存在’
    auth_code?: string[];
    password?: string[]; // 保存多段验证未通过的提示信息，如‘密码必须至少8位’，‘密码必须包含数字、字母和符号中的至少两种’
    isAgree?: string[];
  };
  message?: string | null;
  success?: boolean;
  status?: number;
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
    coverUrl: string;
    coverFileName: string;
    platform: string;
  };
  message?: string | null;
};

export type EpisodeState = {
  errors?: {
    title: string;
    description: string;
    audioFileName: string;
    podcastId: string;
    coverFileName: string;
  };
  message?: string | null;
};

// 表单校验（zod schema）
const UserRegister = registerFormSchema;

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
    // revalidatePath("/auth/signup");
    // redirect("/auth/register-success");
    return {
      errors: data.errors,
      message: data.message,
      success: data.success,
      status: data.status,
    };
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
    const coverFileName = formData.get("coverFileName");
    const coverUrl = formData.get("coverUrl");
    if (coverFileName === null || coverFileName === "") {
      return new Promise((resolve) => {
        resolve({
          errors: {
            podcastName: "",
            description: "",
            coverUrl: "请上传封面图片", // 使用已定义的 cover 字段
            coverFileName: "",
            platform: "",
          },
          message: "缺少必要文件",
        });
      });
    }
    const res = await fetch(`${baseUrl}/api/podcast/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        podcastName: formData.get("podcastName"),
        description: formData.get("description"),
        coverUrl: coverUrl,
        coverFileName: coverFileName,
        isEditorPick: formData.get("isEditorPick") === "on",
        platform: formData.get("platform"),
        tags: formData.getAll("tags"),
      }),
    });
    if (!res.ok) {
      return new Promise((resolve) => {
        resolve({
          message: "创建播客失败",
        });
      });
    }
    if (res.ok) {
      revalidatePath("/dashboard/podcasts/create");
      // 先返回成功状态再执行重定向
      return {
        errors: {
          podcastName: "",
          description: "",
          coverUrl: "",
          coverFileName: "",
          platform: "",
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
          coverUrl: "",
          coverFileName: "",
          platform: "",
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
      coverUrl: "",
      coverFileName: "",
      platform: "",
    },
    message: "未知错误",
  };
}

export async function createEpisode(
  prevState: EpisodeState,
  formData: FormData,
): Promise<EpisodeState> {
  try {
    // 用户认证检查
    const session = await auth();
    if (!session?.user?.userid) {
      return {
        errors: {
          title: "",
          description: "",
          audioFileName: "",
          podcastId: "",
          coverFileName: "",
        },
        message: "未认证用户",
      };
    }

    const subtitleEnFileName = formData.get("subtitleEnFileName");
    const subtitleZhFileName = formData.get("subtitleZhFileName");
    const subtitleEnUrl = formData.get("subtitleEnUrl");
    const subtitleZhUrl = formData.get("subtitleZhUrl");

    const audioFileName = formData.get("audioFileName");
    if (audioFileName === null || audioFileName === "") {
      return new Promise((resolve) => {
        resolve({
          errors: {
            title: "",
            description: "",
            audioFileName: "请上传音频文件",
            podcastId: "",
            coverFileName: "",
          },
          message: "缺少必要文件",
        });
      });
    }
    const coverFileName = formData.get("coverFileName");
    if (coverFileName === null || coverFileName === "") {
      return new Promise((resolve) => {
        resolve({
          errors: {
            title: "",
            description: "",
            audioFileName: "",
            podcastId: "",
            coverFileName: "请上传封面图片",
          },
          message: "缺少必要文件",
        });
      });
    }
    const res = await fetch(`${baseUrl}/api/episode/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        description: formData.get("description"),
        audioDuration: formData.get("audioDuration"),
        audioFileName: audioFileName,
        coverFileName: coverFileName,
        subtitleEnFileName:
          subtitleZhFileName === "" ? null : subtitleEnFileName,
        subtitleZhFileName:
          subtitleZhFileName === "" ? null : subtitleZhFileName,
        subtitleEnUrl: subtitleEnUrl === "" ? null : subtitleEnUrl,
        subtitleZhUrl: subtitleZhUrl === "" ? null : subtitleZhUrl,
        audioUrl: formData.get("audioUrl"),
        coverUrl: formData.get("coverUrl"),
        publishStatus: formData.get("publishStatus"),
        isExclusive: formData.get("isExclusive") === "on",
        publishDate: formData.get("publishDate"),
        tags: formData.getAll("tags"),
        podcastId: formData.get("podcastId"),
        uploaderId: session?.user?.userid,
      }),
    });
    if (!res.ok) {
      return new Promise((resolve) => {
        resolve({
          errors: {
            title: "",
            description: "",
            audioFileName: "",
            podcastId: "",
            coverFileName: "",
          },
          message: "创建过程中发生错误",
        });
      });
    }
    const data = await res.json();
    if (res.ok) {
      console.log("创建剧集成功:", data);
      revalidatePath("/dashboard/episodes/create");
      return {
        errors: {
          title: "",
          description: "",
          audioFileName: "",
          podcastId: "",
          coverFileName: "",
        },
        // 在episodes页面中，通过message判断是否需要重定向
        message: "redirect:/dashboard/episodes/create-success",
      };
    }
  } catch (error) {
    console.error("创建剧集失败:", error);
    return new Promise((resolve) => {
      resolve({
        errors: {
          title: "",
          description: "",
          audioFileName: "",
          podcastId: "",
          coverFileName: "",
        },
        message: "创建过程中发生错误",
      });
    });
  }
  // 添加默认返回（防御性编程）
  return {
    errors: {
      title: "",
      description: "",
      audioFileName: "",
      podcastId: "",
      coverFileName: "",
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
  id: string,
  coverFileName: string,
): Promise<PodcastDelState> {
  // 删除OSS中封面图片
  const result = await deleteObject(coverFileName);

  const res = await fetch(`${baseUrl}/api/podcast/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ podcastid: id }),
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

export async function deleteFile(fileName: string) {
  const result = await deleteObject(fileName);
  if (result && result.res && result.res.status === 204) {
    return {
      message: "删除成功",
      status: 200,
    };
  } else {
    return {
      message: "删除失败",
      status: 500,
    };
  }
}

export type EpisodeDelState = {
  message?: string;
  status: number;
};
// 删除剧集
export async function deleteEpisode(
  id: string,
  coverFileName: string,
  audioFileName: string,
  subtitleEnFileName: string,
  subtitleZhFileName: string,
): Promise<EpisodeDelState> {
  // 删除OSS中封面图片
  const delCoverResult = await deleteObject(coverFileName);
  const delAudioResult = await deleteObject(audioFileName);
  const delSubtitleEnResult = await deleteObject(subtitleEnFileName);
  const delSubtitleZhResult = await deleteObject(subtitleZhFileName);

  const res = await fetch(`${baseUrl}/api/episode/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ episodeid: id }),
  });
  const data = await res.json();
  console.log("删除OSS中封面图片", delCoverResult);
  console.log("删除OSS中音频文件", delAudioResult);
  console.log("删除OSS中英文字幕文件", delSubtitleEnResult);
  console.log("删除OSS中中文字幕文件", delSubtitleZhResult);
  console.log("删除数据库中数据", res);
  if (
    !delCoverResult ||
    !delAudioResult ||
    !delSubtitleEnResult ||
    !delSubtitleZhResult ||
    !res.ok
  ) {
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

export type UserDelState = {
  message?: string;
  status: number;
};
// 删除用户
export async function deleteUser(
  id: string,
  avatarFileName: string,
): Promise<UserDelState> {
  let delAvatarResult = null;
  if (avatarFileName) {
    // 删除OSS中用户头像
    delAvatarResult = await deleteObject(avatarFileName);
  }
  const res = await fetch(`${baseUrl}/api/user/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userid: id }),
  });
  const data = await res.json();
  if (!res.ok) {
    return {
      message: "",
      status: 500,
    };
  }
  if (avatarFileName && !delAvatarResult) {
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

// 删除封面
export async function deleteOSSFile(fileName: string) {
  let delFileResult = null;
  // 删除OSS中文件
  delFileResult = await deleteObject(fileName);
  if (!delFileResult) {
    return {
      message: "删除失败",
      status: 500,
      success: false,
    };
  }
  return {
    message: "删除成功",
    status: 200,
    success: true,
  };
}
