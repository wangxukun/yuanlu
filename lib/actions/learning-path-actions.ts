// yuanlu/lib/actions/learning-path-actions.ts
"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { CreateLearningPathSchema } from "@/core/learning-path/dto";
import { learningPathService } from "@/core/learning-path/learning-path.service";
import { episodeService } from "@/core/episode/episode.service";

// 1. 定义泛型 ActionState，替代 data?: any
export type ActionState<T = undefined> = {
  error?: string;
  success?: boolean;
  data?: T;
};

// 定义搜索结果的剧集类型
export interface SearchResultEpisode {
  id: string;
  title: string;
  thumbnailUrl: string;
  author: string;
  duration: number;
}

/**
 * 创建学习路径
 */
export async function createLearningPathAction(
  prevState: ActionState<undefined> | null, // 替换 any
  formData: FormData,
): Promise<ActionState<undefined>> {
  const session = await auth();
  if (!session?.user?.userid) return { error: "请先登录" };

  // 解析 Form Data
  const rawData = {
    pathName: formData.get("pathName"),
    description: formData.get("description"),
    isPublic: formData.get("isPublic") === "true", // Checkbox 处理
  };

  const validatedFields = CreateLearningPathSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      error:
        validatedFields.error.flatten().fieldErrors.pathName?.[0] || "输入无效",
    };
  }

  try {
    await learningPathService.create(session.user.userid, validatedFields.data);
    revalidatePath("/library/learning-paths"); // 刷新列表页
    return { success: true };
  } catch (error: unknown) {
    console.error("Create path error:", error);
    return { error: "创建失败，请稍后重试" };
  }
}

/**
 * 更新学习路径
 */
export async function updateLearningPathAction(
  pathid: number,
  formData: FormData,
): Promise<ActionState<undefined>> {
  const session = await auth();
  // [修复] Schema 中定义的主键是 userid，auth.ts 通常映射为 userid
  if (!session?.user?.userid) return { error: "请先登录" };

  const rawData = {
    pathName: formData.get("pathName"),
    description: formData.get("description"),
    isPublic: formData.get("isPublic") === "true",
  };

  const validatedFields = CreateLearningPathSchema.safeParse(rawData);
  if (!validatedFields.success) {
    return {
      error:
        validatedFields.error.flatten().fieldErrors.pathName?.[0] || "输入无效",
    };
  }

  try {
    // [修复] 使用 session.user.userid 替代 id
    await learningPathService.update(
      pathid,
      session.user.userid,
      validatedFields.data,
    );
    revalidatePath(`/library/learning-paths/${pathid}`);
    return { success: true };
  } catch (error: unknown) {
    console.error("Update path error:", error);
    return { error: "更新失败" };
  }
}

/**
 * 删除学习路径
 */
export async function deleteLearningPathAction(
  pathid: number,
): Promise<ActionState<undefined>> {
  const session = await auth();
  if (!session?.user?.userid) throw new Error("Unauthorized");

  try {
    await learningPathService.delete(pathid, session.user.userid);
    revalidatePath("/library/learning-paths");
  } catch (error: unknown) {
    console.error("Delete path error:", error);
    throw new Error("删除失败");
  }
  // 注意：Server Action 中 redirect 会抛出错误来中断执行，所以要在 try-catch 之外或让 Client 处理跳转
  return { success: true };
}

/**
 * 添加当前剧集到学习路径
 */
export async function addEpisodeToPathAction(
  pathid: number,
  episodeid: string,
): Promise<ActionState<undefined>> {
  const session = await auth();
  if (!session?.user?.userid) return { error: "请先登录" };

  try {
    await learningPathService.addEpisode(
      pathid,
      session.user.userid,
      episodeid,
    );
    revalidatePath(`/podcast`); // 假设我们在播客详情页调用的，可能需要刷新 UI 状态
    return { success: true };
  } catch (error: unknown) {
    // [修复] 类型收窄
    const errorMessage = error instanceof Error ? error.message : "添加失败";
    return { error: errorMessage };
  }
}

/**
 * 移除剧集
 */
export async function removeEpisodeFromPathAction(
  itemId: number,
  pathid: number,
): Promise<ActionState<undefined>> {
  const session = await auth();
  if (!session?.user?.userid) return { error: "Unauthorized" };

  try {
    await learningPathService.removeEpisode(itemId, session.user.userid);
    revalidatePath(`/library/learning-paths/${pathid}`); // 刷新详情页
    return { success: true };
  } catch (error: unknown) {
    console.error("Remove episode error:", error);
    return { error: "移除失败" };
  }
}

/**
 * 搜索可添加的单集
 */
export async function searchEpisodesAction(
  query: string,
): Promise<SearchResultEpisode[]> {
  // 限制搜索结果数量，避免传输过多数据
  const episodes = await episodeService.getManagementList(query);

  // 简单过滤：只返回已发布的（假设 getManagementList 返回所有）
  // 并转换为前端需要的简单格式
  return (
    episodes
      // 注意：这里需确保 episodeService 返回的 status 字段值确实是 "已发布" 或者是对应的枚举值
      .filter((e) => e.status === "published" || e.status === "已发布")
      .slice(0, 20)
      .map((e) => ({
        id: e.id,
        title: e.title,
        // 确保处理 null/undefined 情况
        thumbnailUrl: e.coverUrl || "/static/images/episode-light.png",
        author: e.podcastTitle || "Unknown",
        // [重要] 保持为 number (秒)，不要在此处 toString()，以便前端计算时间
        duration: typeof e.duration === "number" ? e.duration : 0,
      }))
  );
}
