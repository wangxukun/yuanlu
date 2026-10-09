"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/core/auth/guard";

/**
 * 频道运营配置的增删改（管理后台 /admin/channels）。
 * 行数据只影响展示（品牌横幅/描述/排序），删除配置不删除 OSS 横幅对象。
 */
function revalidateChannelPages() {
  revalidatePath("/admin/channels");
  revalidatePath("/discover");
  revalidatePath("/discover/channels");
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

// 创建频道配置（name 须与 podcast.platform 一致才生效）
export async function createChannelAction(formData: FormData) {
  try {
    await requireAdminAction();
  } catch {
    return { error: "未授权，需要管理员权限" };
  }

  const name = ((formData.get("name") as string) || "").trim();
  const coverFileName =
    ((formData.get("coverFileName") as string) || "").trim() || null;
  const description =
    ((formData.get("description") as string) || "").trim() || null;
  const sortOrder = parseInt((formData.get("sortOrder") as string) || "0", 10);

  if (!name) return { error: "频道名称不能为空" };
  if (!Number.isFinite(sortOrder) || sortOrder < 0)
    return { error: "排序权重必须为非负整数" };

  try {
    await prisma.channel.create({
      data: { name, coverFileName, description, sortOrder },
    });
    revalidateChannelPages();
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error))
      return { error: "该频道已存在配置，请直接编辑" };
    console.error("Create channel error:", error);
    return { error: "创建失败" };
  }
}

// 更新频道配置
export async function updateChannelAction(formData: FormData) {
  try {
    await requireAdminAction();
  } catch {
    return { error: "未授权，需要管理员权限" };
  }

  const channelid = (formData.get("channelid") as string) || "";
  const coverFileName =
    ((formData.get("coverFileName") as string) || "").trim() || null;
  const description =
    ((formData.get("description") as string) || "").trim() || null;
  const sortOrder = parseInt((formData.get("sortOrder") as string) || "0", 10);

  if (!channelid) return { error: "缺少频道 ID" };
  if (!Number.isFinite(sortOrder) || sortOrder < 0)
    return { error: "排序权重必须为非负整数" };

  try {
    await prisma.channel.update({
      where: { channelid },
      data: { coverFileName, description, sortOrder },
    });
    revalidateChannelPages();
    return { success: true };
  } catch (error) {
    console.error("Update channel error:", error);
    return { error: "更新失败，配置可能已被删除" };
  }
}

// 删除频道配置（不影响 OSS 横幅与播客数据）
export async function deleteChannelAction(channelid: string) {
  try {
    await requireAdminAction();
  } catch {
    return { error: "未授权，需要管理员权限" };
  }

  if (!channelid) return { error: "缺少频道 ID" };

  try {
    await prisma.channel.delete({ where: { channelid } });
    revalidateChannelPages();
    return { success: true };
  } catch (error) {
    console.error("Delete channel error:", error);
    return { error: "删除失败，配置可能已被删除" };
  }
}
