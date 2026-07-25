"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/core/auth/guard";
import prisma from "@/lib/prisma";
import { generateTagConnectOrCreate } from "@/lib/tools";
import { deleteObject } from "@/lib/oss";

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

export type PodcastDelState = {
  message?: string;
  status: number;
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
    // [安全修复] 只有 ADMIN 才能创建播客
    await requireAdminAction();

    const title = formData.get("podcastName") as string;
    const description = formData.get("description") as string;
    const platform = formData.get("platform") as string;
    const coverUrl = formData.get("coverUrl") as string;
    const coverFileName = formData.get("coverFileName") as string;
    const isEditorPick = formData.get("isEditorPick") === "on";
    const tags = formData.getAll("tags") as string[];

    // 简单校验
    if (!title || !coverUrl) {
      return { message: "请补全标题和封面信息" };
    }

    await prisma.podcast.create({
      data: {
        title,
        description,
        platform,
        coverUrl,
        coverFileName,
        isEditorPick,
        tags: {
          connectOrCreate: generateTagConnectOrCreate(tags),
        },
      },
    });

    revalidatePath("/admin/podcasts");
    return { message: "redirect:/admin/podcasts/create-success" };
  } catch (error) {
    console.error("Create Podcast Error:", error);
    return { message: "创建失败，可能是标题重复或数据库错误" };
  }
}

// 2. 更新播客 (新增)
export async function updatePodcast(
  id: string,
  prevState: PodcastState,
  formData: FormData,
): Promise<PodcastState> {
  try {
    // [安全修复] 只有 ADMIN 才能更新播客
    await requireAdminAction();

    const title = formData.get("podcastName") as string;
    const description = formData.get("description") as string;
    const platform = formData.get("platform") as string;
    const coverUrl = formData.get("coverUrl") as string;
    const coverFileName = formData.get("coverFileName") as string;
    const isEditorPick = formData.get("isEditorPick") === "on";
    const tags = formData.getAll("tags") as string[];

    await prisma.podcast.update({
      where: { podcastid: id },
      data: {
        title,
        description,
        platform,
        coverUrl,
        coverFileName,
        isEditorPick,
        tags: {
          set: [], // 先清空现有标签关联
          connectOrCreate: generateTagConnectOrCreate(tags), // 再重新关联
        },
      },
    });

    revalidatePath("/admin/podcasts");
    // 编辑成功后直接跳转回列表，或者停留在编辑页提示成功
    return { message: "redirect:/admin/podcasts" };
  } catch (error) {
    console.error("Update Podcast Error:", error);
    return { message: "更新失败，请重试" };
  }
}

// 删除播客
export async function deletePodcast(
  id: string,
  coverFileName: string,
): Promise<PodcastDelState> {
  try {
    // [安全修复] 只有 ADMIN 才能删除播客
    await requireAdminAction();

    // 1. 删除数据库数据
    // Prisma 的 onDelete: Cascade 应该会处理 tags 关联（隐式多对多通常只是删除关联记录）
    // 但必须确保 episode 是否级联删除？Schema 中 episode 没有定义 onDelete: Cascade 指向 podcast
    // 所以如果 podcast 下有 episode，数据库可能会报错。

    // 检查是否有关联的 Episodes
    const episodesCount = await prisma.episode.count({
      where: { podcastid: id },
    });

    if (episodesCount > 0) {
      return {
        message: `无法删除：该合集下还有 ${episodesCount} 个音频。请先删除或转移音频。`,
        status: 400,
      };
    }

    await prisma.podcast.delete({
      where: { podcastid: id },
    });

    // 2. 删除OSS中封面图片
    if (coverFileName) {
      await deleteObject(coverFileName);
    }

    // 3. 刷新页面
    revalidatePath("/admin/podcasts");

    return {
      message: "删除成功",
      status: 200,
    };
  } catch (error) {
    console.error("Delete Podcast Error:", error);
    return {
      message: "删除失败，服务器错误",
      status: 500,
    };
  }
}
