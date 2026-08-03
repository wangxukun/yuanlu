"use server";

import { adminDictionaryService } from "@/core/admin/dictionary.service";
import { requireAdminAction } from "@/core/auth/guard";
import { revalidatePath } from "next/cache";
import type { DictEntryDTO } from "@/core/dictionary/dto";

export async function regenerateWordAction(word: string) {
  try {
    await requireAdminAction();
    const data = await adminDictionaryService.regenerateWord(word);
    return { success: true, data };
  } catch (error) {
    const err = error as Error;
    console.error("regenerateWordAction error:", err);
    return { success: false, error: err.message || "重新生成失败" };
  }
}

export async function updateDictionaryAction(word: string, data: DictEntryDTO) {
  try {
    await requireAdminAction();
    await adminDictionaryService.updateDictionary(word, data);
    revalidatePath("/admin/dictionary");
    return { success: true };
  } catch (error) {
    const err = error as Error;
    console.error("updateDictionaryAction error:", err);
    return { success: false, error: err.message || "更新失败" };
  }
}

export async function deleteDictionaryAction(id: string, word: string) {
  try {
    await requireAdminAction();
    await adminDictionaryService.deleteDictionary(id, word);
    revalidatePath("/admin/dictionary");
    return { success: true };
  } catch (error) {
    const err = error as Error;
    console.error("deleteDictionaryAction error:", err);
    return { success: false, error: err.message || "删除失败" };
  }
}
