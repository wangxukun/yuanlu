"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { requireAdminAction } from "@/core/auth/guard";
import { episodeService } from "@/core/episode/episode.service";
import { generateTagConnectOrCreate } from "@/lib/tools";
import { deleteObject } from "@/lib/oss";

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

export type EpisodeDelState = {
  message?: string;
  status: number;
};

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
    const subtitleBilingualFileName = formData.get(
      "subtitleBilingualFileName",
    ) as string;
    const subtitleEnUrl = formData.get("subtitleEnUrl") as string;
    const subtitleZhUrl = formData.get("subtitleZhUrl") as string;
    const subtitleBilingualUrl = formData.get("subtitleBilingualUrl") as string;
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
    const difficulty = formData.get("difficulty") as string | null;
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
    await episodeService.create({
      title,
      description,
      audioFileName,
      audioUrl,
      coverFileName,
      coverUrl,
      subtitleEnFileName,
      subtitleZhFileName,
      subtitleBilingualFileName,
      subtitleEnUrl,
      subtitleZhUrl,
      subtitleBilingualUrl,
      podcastid: podcastId,
      isExclusive,
      publishAt: new Date(publishDate),
      duration: audioDuration,
      status: publishStatus,
      difficulty: difficulty || "General",
      uploaderid: uploaderId,
      tags: tagsConnect
        ? {
            connectOrCreate: tagsConnect,
          }
        : undefined,
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
}

// 删除剧集
export async function deleteEpisode(
  id: string,
  coverFileName: string,
  audioFileName: string,
  subtitleEnFileName: string,
  subtitleZhFileName: string,
  subtitleBilingualFileName: string,
): Promise<EpisodeDelState> {
  await requireAdminAction();

  const delCoverResult = await deleteObject(coverFileName);
  const delAudioResult = await deleteObject(audioFileName);
  const delSubtitleEnResult = await deleteObject(subtitleEnFileName);
  const delSubtitleZhResult = await deleteObject(subtitleZhFileName);
  const delSubtitleBilingualResult = await deleteObject(
    subtitleBilingualFileName,
  );

  const { success, message } = await episodeService.delete(id);

  if (
    !delCoverResult ||
    !delAudioResult ||
    !delSubtitleEnResult ||
    !delSubtitleZhResult ||
    !delSubtitleBilingualResult ||
    !success
  ) {
    return {
      message: "删除失败",
      status: 500,
    };
  }
  return {
    message: message || "删除成功",
    status: 200,
  };
}

export async function deleteEpisodeById(id: string) {
  // [安全修复] 只有 ADMIN 才能删除剧集
  await requireAdminAction();

  const {
    audioFileName,
    coverFileName,
    subtitleEnFileName,
    subtitleZhFileName,
    subtitleBilingualFileName,
  } = await episodeService.getEpisodeOSSFiles(id);

  const delCoverResult = await deleteObject(coverFileName);
  const delAudioResult = await deleteObject(audioFileName);
  const delSubtitleEnResult = await deleteObject(subtitleEnFileName);
  const delSubtitleZhResult = await deleteObject(subtitleZhFileName);
  const delSubtitleBilingualResult = await deleteObject(
    subtitleBilingualFileName,
  );
  // 删除数据库中数据
  const { success } = await episodeService.delete(id);

  if (
    !delCoverResult ||
    !delAudioResult ||
    !delSubtitleEnResult ||
    !delSubtitleZhResult ||
    !delSubtitleBilingualResult ||
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
