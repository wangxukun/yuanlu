"use server";

import { auth } from "@/auth";
import { vocabularyService } from "@/core/vocabulary/vocabulary.service";
import { ReviewQuality } from "@/lib/srs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const submitReviewSchema = z.object({
  vocabularyId: z.number(),
  quality: z.nativeEnum(ReviewQuality),
});

/**
 * Server Action: 提交复习结果
 */
export async function submitReviewAction(
  vocabularyId: number,
  quality: number,
) {
  try {
    // 1. 鉴权
    const session = await auth();
    if (!session?.user?.userid) {
      return { success: false, message: "未登录" };
    }

    // 2. 校验
    const parsed = submitReviewSchema.safeParse({ vocabularyId, quality });
    if (!parsed.success) {
      return { success: false, message: "参数无效" };
    }

    // 3. 调用 Service
    const result = await vocabularyService.submitReview(
      session.user.userid,
      parsed.data.vocabularyId,
      parsed.data.quality,
    );

    // 4. (可选) 重新验证页面数据
    // 如果你在 /library/vocabulary 页面展示列表，提交后需要刷新列表
    revalidatePath("/library/vocabulary");

    return { success: true, message: "打卡成功", data: result };
  } catch (error) {
    console.error("submitReviewAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "提交失败",
    };
  }
}

/**
 * Server Action: 更新单词状态 (例如标记为已掌握)
 */
export async function updateVocabularyStatusAction(
  vocabularyId: number,
  status: "LEARNING" | "MASTERED",
) {
  try {
    const session = await auth();
    if (!session?.user?.userid) {
      return { success: false, message: "未登录" };
    }

    const result = await vocabularyService.updateStatus(
      session.user.userid,
      vocabularyId,
      status,
    );

    revalidatePath("/library/vocabulary");

    return {
      success: true,
      message: status === "MASTERED" ? "已标记为掌握" : "已放回生词本",
      data: result,
    };
  } catch (error) {
    console.error("updateVocabularyStatusAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "更新状态失败",
    };
  }
}
