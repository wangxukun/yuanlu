"use server";

import { auth } from "@/auth";
import { listeningHistoryService } from "@/core/listening-history/listening-history.service";
import { revalidatePath } from "next/cache";

export async function removeHistoryAction(historyId: number) {
  try {
    const session = await auth();
    if (!session?.user?.userid) {
      return { success: false, message: "未登录" };
    }

    await listeningHistoryService.deleteHistory(session.user.userid, historyId);

    revalidatePath("/library/history");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete history:", error);
    return { success: false, message: "删除失败" };
  }
}

export async function clearHistoryAction() {
  try {
    const session = await auth();
    if (!session?.user?.userid) {
      return { success: false, message: "未登录" };
    }

    await listeningHistoryService.clearAllHistory(session.user.userid);

    revalidatePath("/library/history");
    return { success: true };
  } catch (error) {
    console.error("Failed to clear history:", error);
    return { success: false, message: "清空失败" };
  }
}
