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
