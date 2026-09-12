"use server";

import { revalidatePath } from "next/cache";
import { requireAuthAction } from "@/core/auth/guard";
import { sentencesService } from "@/core/sentences/sentences.service";
import {
  savedSentenceQuerySchema,
  toggleSentenceSaveSchema,
  updateSentenceMetaSchema,
} from "@/core/sentences/dto";

export interface SentenceActionResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * Server Action: 切换句子收藏状态
 * 已收藏 → 取消收藏；未收藏 → 收藏（返回新记录，供前端补标签/笔记）
 */
export async function toggleSentenceSave(input: {
  episodeid: string;
  subtitleId?: number | null;
  startTime: number;
  endTime: number;
  enText: string;
  zhText?: string | null;
}): Promise<
  SentenceActionResponse<
    Awaited<ReturnType<typeof sentencesService.toggleSave>>
  >
> {
  try {
    const session = await requireAuthAction();

    const parsed = toggleSentenceSaveSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "参数无效" };
    }

    const result = await sentencesService.toggleSave(
      session.user.userid,
      parsed.data,
    );

    revalidatePath("/library/sentences");
    return {
      success: true,
      message: result.saved ? "已收藏该句子" : "已取消收藏",
      data: result,
    };
  } catch (error) {
    console.error("toggleSentenceSave error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "操作失败",
    };
  }
}

/**
 * Server Action: 更新句子的标签与笔记
 */
export async function updateSentenceMeta(input: {
  id: number;
  note?: string | null;
  tags?: string[];
}): Promise<
  SentenceActionResponse<
    Awaited<ReturnType<typeof sentencesService.updateMeta>>
  >
> {
  try {
    const session = await requireAuthAction();

    const parsed = updateSentenceMetaSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "参数无效（标签最多 10 个）" };
    }

    const result = await sentencesService.updateMeta(
      session.user.userid,
      parsed.data,
    );

    revalidatePath("/library/sentences");
    return { success: true, message: "已保存", data: result };
  } catch (error) {
    console.error("updateSentenceMeta error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "更新失败",
    };
  }
}

/**
 * Server Action: 获取用户收藏列表（支持来源/标签/时间范围/中英文全文检索）
 * 页面直连 service 渲染；该 Action 供客户端按需刷新（移动端复用同一鉴权口径）
 */
export async function getSavedSentences(
  query: {
    episodeid?: string;
    tag?: string;
    from?: Date | string;
    to?: Date | string;
    q?: string;
  } = {},
): Promise<
  SentenceActionResponse<
    Awaited<ReturnType<typeof sentencesService.getSavedSentences>>
  >
> {
  try {
    const session = await requireAuthAction();

    const parsed = savedSentenceQuerySchema.safeParse(query);
    if (!parsed.success) {
      return { success: false, message: "筛选参数无效" };
    }

    const list = await sentencesService.getSavedSentences(
      session.user.userid,
      parsed.data,
    );

    return { success: true, message: "ok", data: list };
  } catch (error) {
    console.error("getSavedSentences error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "查询失败",
    };
  }
}

/**
 * Server Action: 删除收藏句子（句子本看板操作）
 */
export async function deleteSavedSentence(
  id: number,
): Promise<SentenceActionResponse> {
  try {
    const session = await requireAuthAction();

    if (!Number.isInteger(id)) {
      return { success: false, message: "参数无效" };
    }

    await sentencesService.deleteSentence(session.user.userid, id);

    revalidatePath("/library/sentences");
    return { success: true, message: "已删除" };
  } catch (error) {
    console.error("deleteSavedSentence error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "删除失败",
    };
  }
}
