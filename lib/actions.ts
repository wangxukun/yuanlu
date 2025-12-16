"use server";

import { revalidatePath } from "next/cache";
import { registerFormSchema } from "@/lib/form-schema";
import { deleteObject, uploadFile } from "@/lib/oss";
import { auth } from "@/auth";
import { episodeService } from "@/core/episode/episode.service";
import { Prisma } from "@prisma/client";
import { ActionState } from "@/lib/types";
import { generateTagConnectOrCreate } from "@/lib/tools";
import prisma from "@/lib/prisma";

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
      revalidatePath("/admin/podcasts/create");
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
        message: "redirect:/admin/podcasts/create-success", // 添加特殊标识
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

    const subtitleEnFileName = formData.get("subtitleEnFileName") as string;
    const subtitleZhFileName = formData.get("subtitleZhFileName") as string;
    const subtitleEnUrl = formData.get("subtitleEnUrl") as string;
    const subtitleZhUrl = formData.get("subtitleZhUrl") as string;
    const audioFileName = formData.get("audioFileName") as string;
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
    const coverFileName = formData.get("coverFileName") as string;
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
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const audioDurationStr = formData.get("audioDuration") as string;
    const audioDuration = parseInt(audioDurationStr || "0", 10);
    const audioUrl = formData.get("audioUrl") as string;
    const coverUrl = formData.get("coverUrl") as string;
    const publishStatus = formData.get("publishStatus") as string;
    const isExclusive = formData.get("isExclusive") === "on";
    const publishDate = formData.get("publishDate") as string;
    const tags = formData.getAll("tags") as string[];
    const podcastId = formData.get("podcastId") as string;
    const uploaderId = session?.user?.userid;

    // 检查是否缺少参数
    if (
      !podcastId ||
      !title ||
      !coverUrl ||
      !coverFileName ||
      !audioUrl ||
      !audioFileName ||
      !audioDuration ||
      !publishDate ||
      !description ||
      !publishStatus
    ) {
      return new Promise((resolve) => {
        resolve({
          errors: {
            title: "",
            description: "",
            audioFileName: "",
            podcastId: "",
            coverFileName: "",
          },
          message: "缺少参数",
        });
      });
    }

    // 3. 准备标签关联数据
    const tagsConnect = generateTagConnectOrCreate(tags);

    // 4. 写入数据库
    await prisma.episode.create({
      data: {
        title,
        description,
        audioFileName,
        audioUrl,
        coverFileName,
        coverUrl,
        subtitleEnFileName,
        subtitleZhFileName,
        subtitleEnUrl,
        subtitleZhUrl,
        podcastid: podcastId,
        isExclusive,
        publishAt: new Date(publishDate),
        duration: audioDuration,
        status: publishStatus,
        uploaderid: uploaderId,
        tags: tagsConnect
          ? {
              connectOrCreate: tagsConnect,
            }
          : undefined,
      },
      include: {
        tags: true, // 添加此选项以返回关联的标签
      },
    });

    console.log("Server Action: 创建剧集成功:");
    revalidatePath("/admin/episodes/create");
    return {
      errors: {
        title: "",
        description: "",
        audioFileName: "",
        podcastId: "",
        coverFileName: "",
      },
      // 在episodes页面中，通过message判断是否需要重定向
      message: "redirect:/admin/episodes/create-success",
    };
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

export async function deleteEpisodeById(id: string) {
  const {
    audioFileName,
    coverFileName,
    subtitleEnFileName,
    subtitleZhFileName,
  } = await episodeService.getEpisodeOSSFiles(id);

  // 删除OSS中文件
  const delCoverResult = await deleteObject(coverFileName);
  const delAudioResult = await deleteObject(audioFileName);
  const delSubtitleEnResult = await deleteObject(subtitleEnFileName);
  const delSubtitleZhResult = await deleteObject(subtitleZhFileName);
  // 删除数据库中数据
  const { success } = await episodeService.delete(id);

  if (
    !delCoverResult ||
    !delAudioResult ||
    !delSubtitleEnResult ||
    !delSubtitleZhResult ||
    !success
  ) {
    return {
      message: "删除稿件失败",
      success: false,
    };
  }

  return {
    message: "redirect:/admin/episodes/",
    success,
  };
}

/**
 * 删除OSS文件
 * @param fileName
 */
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

/**
 * 删除英文字幕的 Server Action
 * @param prevState 删除英文字幕的初始状态
 * @param formData 删除英文字幕的表单数据
 */
export async function deleteEnSubtitle(
  prevState: ActionState,
  formData: FormData,
) {
  const id = formData.get("episodeId") as string;
  const fileName = formData.get("fileName") as string;
  try {
    // 从服务器删除文件
    await deleteOSSFile(fileName);
    // 更新数据库记录
    const updateData: Prisma.episodeUpdateInput = {
      subtitleEnUrl: null,
      subtitleEnFileName: null,
    };
    await episodeService.updateSubtitleEn(id, updateData);
    return { success: true, message: "英文字幕删除成功" };
  } catch (error) {
    console.error("删除英文字幕失败:", error);
    return { success: false, message: "英文字幕删除失败" };
  }
}

/**
 * 删除中文字幕的 Server Action
 * @param prevState 删除中文字幕的初始状态
 * @param formData 删除中文字幕的表单数据
 */
export async function deleteZhSubtitle(
  prevState: ActionState,
  formData: FormData,
) {
  "use server";
  const id = formData.get("episodeId") as string;
  const fileName = formData.get("fileName") as string;
  try {
    // 从服务器删除文件
    await deleteOSSFile(fileName);
    // 更新数据库记录
    const updateData: Prisma.episodeUpdateInput = {
      subtitleZhUrl: null,
      subtitleZhFileName: null,
    };
    await episodeService.updateSubtitleZh(id, updateData);
    return { success: true, message: "中文字幕删除成功" };
  } catch (error) {
    console.error("删除中文字幕失败:", error);
    return { success: false, message: "删除失败" };
  }
}

/**
 * 上传英文字幕的 Server Action
 * @param prevState 上传字幕的初始状态
 * @param formData 上传字幕的表单数据
 */
export async function uploadEnSubtitle(
  prevState: ActionState,
  formData: FormData,
) {
  "use server";
  const id = formData.get("episodeId") as string;
  const file = formData.get("subtitleFile") as File;

  if (!file || file.size === 0) {
    return { success: false, message: "请选择文件" };
  }

  // 检查文件类型
  if (!file.name.endsWith(".srt") && !file.name.endsWith(".vtt")) {
    return { success: false, message: "请选择 .srt 或 .vtt 格式的字幕文件" };
  }

  try {
    // 生成唯一文件名
    const timestamp = Date.now();
    const fileName = `yuanlu/podcastes/episodes/subtitles/${timestamp}_${Math.random().toString(36).substring(2)}.${file.name.split(".").pop()}`;

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传到OSS
    const result = await uploadFile(buffer, fileName);

    // 更新数据库记录
    const updateData: Prisma.episodeUpdateInput = {
      subtitleEnUrl: result.fileUrl,
      subtitleEnFileName: result.fileName,
    };

    await episodeService.update(id, updateData);

    return { success: true, message: "英文字幕上传成功" };
  } catch (error) {
    console.error("上传英文字幕失败:", error);
    return { success: false, message: "英文字幕上传失败" };
  }
}

/**
 * 上传中文字幕的 Server Action
 * @param prevState 上传字幕的初始状态
 * @param formData 上传字幕的表单数据
 */
export async function uploadZhSubtitle(
  prevState: ActionState,
  formData: FormData,
) {
  "use server";
  const id = formData.get("episodeId") as string;
  const file = formData.get("subtitleFile") as File;

  if (!file || file.size === 0) {
    return { success: false, message: "请选择文件" };
  }

  // 检查文件类型
  if (!file.name.endsWith(".srt") && !file.name.endsWith(".vtt")) {
    return { success: false, message: "请选择 .srt 或 .vtt 格式的字幕文件" };
  }

  try {
    // 生成唯一文件名
    const timestamp = Date.now();
    const fileName = `yuanlu/podcastes/episodes/subtitles/${timestamp}_${Math.random().toString(36).substring(2)}.${file.name.split(".").pop()}`;

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传到OSS
    const result = await uploadFile(buffer, fileName);

    // 更新数据库记录
    const updateData: Prisma.episodeUpdateInput = {
      subtitleZhUrl: result.fileUrl,
      subtitleZhFileName: result.fileName,
    };

    await episodeService.update(id, updateData);

    return { success: true, message: "中文字幕上传成功" };
  } catch (error) {
    console.error("上传中文字幕失败:", error);
    return { success: false, message: "中文字幕上传失败" };
  }
}
