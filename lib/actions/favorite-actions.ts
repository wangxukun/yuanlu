"use server";

import { requireAuthAction } from "@/core/auth/guard";
import { revalidatePath } from "next/cache";
import { favoritesService } from "@/core/favorites/favorites.service";

// --- 播客收藏或取消收藏 ---

export async function togglePodcastFavorite(
  podcastId: string,
  pathname?: string,
) {
  let session;
  try {
    session = await requireAuthAction();
  } catch (error) {
    return { success: false, message: "请先登录" };
  }
  const userId = session.user.userid;

  try {
    const result = await favoritesService.togglePodcastFavorite({
      userId,
      targetId: podcastId,
    });

    if (pathname && result.success) revalidatePath(pathname);
    return {
      success: result.success,
      isFavorited: result.data?.isFavorited,
      message: result.message,
    };
  } catch (error) {
    console.error("Toggle podcast favorite error:", error);
    return { success: false, message: "操作失败" };
  }
}

// --- 单集收藏或取消收藏 ---

export async function toggleEpisodeFavorite(
  episodeId: string,
  pathname?: string,
) {
  let session;
  try {
    session = await requireAuthAction();
  } catch (error) {
    return { success: false, message: "请先登录" };
  }
  const userId = session.user.userid;

  try {
    const result = await favoritesService.toggleEpisodeFavorite({
      userId,
      targetId: episodeId,
    });

    if (pathname && result.success) revalidatePath(pathname);
    return {
      success: result.success,
      isFavorited: result.data?.isFavorited,
      message: result.message,
    };
  } catch (error) {
    console.error("Toggle episode favorite error:", error);
    return { success: false, message: "操作失败" };
  }
}

export async function removePodcastFavoriteAction(podcastId: string) {
  try {
    const session = await requireAuthAction();
    const userId = session.user.userid;
    if (!userId) {
      return { success: false, message: "未登录" };
    }

    await favoritesService.removePodcastFavorite(
      session.user.userid,
      podcastId,
    );
    revalidatePath("/library/favorites");
    return { success: true };
  } catch (error) {
    console.error("Failed to remove podcast favorite:", error);
    return { success: false, message: "操作失败" };
  }
}

export async function removeEpisodeFavoriteAction(episodeId: string) {
  try {
    const session = await requireAuthAction();
    const userId = session.user.userid;
    if (!userId) {
      return { success: false, message: "未登录" };
    }

    await favoritesService.removeEpisodeFavorite(
      session.user.userid,
      episodeId,
    );
    revalidatePath("/library/favorites");
    return { success: true };
  } catch (error) {
    console.error("Failed to remove episode favorite:", error);
    return { success: false, message: "操作失败" };
  }
}
