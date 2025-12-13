"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth"; // 假设你有权限校验

/**
 * 核心逻辑：处理标签的创建与关联
 * 输入：逗号分隔的字符串 (如 "Business, Daily Life") 或 字符串数组
 * 输出：符合 Prisma connect/create 语法的对象数组
 */
export async function processTagsInput(tagsInput: string | string[]) {
  let tagNames: string[] = [];

  if (typeof tagsInput === "string") {
    // 处理逗号分隔的字符串，去空、去重
    tagNames = tagsInput
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);
  } else if (Array.isArray(tagsInput)) {
    tagNames = tagsInput.map((t) => t.trim()).filter(Boolean);
  }

  // 去重 (防止输入 "Apple, Apple")
  tagNames = Array.from(new Set(tagNames));

  // 构建 Prisma 的 connectOrCreate 语法
  // 这种写法意味着：如果标签存在，就 connect (关联)，不存在就 create (创建)
  return tagNames.map((name) => ({
    where: { name },
    create: { name },
  }));
}

/**
 * 获取所有标签（用于前端自动补全建议）
 */
export async function getAllTags() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: Prisma.SortOrder.asc },
  });
  return tags;
}

// 创建标签
export async function createTag(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "未授权" };

  const name = formData.get("name") as string;
  if (!name || !name.trim()) return { error: "标签名称不能为空" };

  try {
    await prisma.tag.create({
      data: { name: name.trim() },
    });
    revalidatePath("/admin/tags");
    return { success: true };
  } catch (error) {
    console.error("Create tag error:", error);
    return { error: "创建失败，标签可能已存在" };
  }
}

// 更新标签
export async function updateTag(id: number, newName: string) {
  const session = await auth();
  if (!session?.user) return { error: "未授权" };

  if (!newName || !newName.trim()) return { error: "标签名称不能为空" };

  try {
    await prisma.tag.update({
      where: { id },
      data: { name: newName.trim() },
    });
    revalidatePath("/admin/tags");
    return { success: true };
  } catch (error) {
    console.error("Update tag error:", error);
    return { error: "更新失败" };
  }
}

// 删除标签
export async function deleteTag(id: number) {
  const session = await auth();
  if (!session?.user) return { error: "未授权" };

  try {
    await prisma.tag.delete({
      where: { id },
    });
    revalidatePath("/admin/tags");
    return { success: true };
  } catch (error) {
    console.error("Delete tag error:", error);
    return { error: "删除失败" };
  }
}
