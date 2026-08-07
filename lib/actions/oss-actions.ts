"use server";

import { deleteObject, uploadFile } from "@/lib/oss";
import { episodeService } from "@/core/episode/episode.service";
import { ActionState } from "@/lib/types";
import { Prisma } from "@prisma/client";

/**
 * OSS  文件删除
 * @param fileName
 */
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
 * 删除双语字幕的 Server Action
 * @param prevState 删除双语字幕的初始状态
 * @param formData 删除双语字幕的表单数据
 */
export async function deleteBilingualSubtitle(
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
      subtitleBilingualUrl: null,
      subtitleBilingualFileName: null,
    };
    await episodeService.updateSubtitleBilingual(id, updateData);
    return { success: true, message: "双语字幕删除成功" };
  } catch (error) {
    console.error("删除双语字幕失败:", error);
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

/**
 * 上传双语字幕的 Server Action
 * @param prevState 上传字幕的初始状态
 * @param formData 上传字幕的表单数据
 */
export async function uploadBilingualSubtitle(
  prevState: ActionState,
  formData: FormData,
) {
  const id = formData.get("episodeId") as string;
  const file = formData.get("subtitleFile") as File;

  if (!file || file.size === 0) {
    return { success: false, message: "请选择文件" };
  }

  // 检查文件类型
  if (!file.name.endsWith(".json")) {
    return { success: false, message: "请选择 .json 格式的字幕文件" };
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
      subtitleBilingualUrl: result.fileUrl,
      subtitleBilingualFileName: result.fileName,
    };

    await episodeService.update(id, updateData);

    return { success: true, message: "双语字幕上传成功" };
  } catch (error) {
    console.error("上传双语字幕失败:", error);
    return { success: false, message: "双语字幕上传失败" };
  }
}

/**
 * 上传封面的 Server Action
 * @param prevState 上传封面的初始状态
 * @param formData 上传封面的表单数据
 */
export async function uploadEpisodeCover(
  prevState: ActionState,
  formData: FormData,
) {
  const id = formData.get("episodeId") as string;
  const file = formData.get("coverFile") as File;

  if (!file || file.size === 0) {
    return { success: false, message: "请选择封面图片" };
  }

  // 检查文件类型
  if (!file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
    return { success: false, message: "请选择格式正确的图片文件" };
  }

  try {
    // 先获取旧的封面文件名以便稍后删除
    const { coverFileName: oldCoverFileName } =
      await episodeService.getEpisodeOSSFiles(id);

    // 生成唯一文件名
    const timestamp = Date.now();
    const fileName = `yuanlu/podcastes/episodes/covers/${timestamp}_${Math.random().toString(36).substring(2)}.${file.name.split(".").pop()}`;

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传到OSS
    const result = await uploadFile(buffer, fileName);

    // 更新数据库记录
    const updateData: Prisma.episodeUpdateInput = {
      coverUrl: result.fileUrl,
      coverFileName: result.fileName,
    };

    await episodeService.update(id, updateData);

    // 删除旧的封面图片
    if (oldCoverFileName) {
      await deleteOSSFile(oldCoverFileName);
    }

    return { success: true, message: "封面上传成功" };
  } catch (error) {
    console.error("上传封面失败:", error);
    return { success: false, message: "封面上传失败" };
  }
}
