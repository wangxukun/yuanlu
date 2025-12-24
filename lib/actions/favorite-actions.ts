"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth"; // 假设这是 NextAuth v5 的配置
import { revalidatePath } from "next/cache";
import { favoritesService } from "@/core/favorites/favorites.service";

// --- 播客收藏或取消收藏 ---

export async function togglePodcastFavorite(
  podcastId: string,
  pathname?: string,
) {
  const session = await auth();
  const userId = session?.user?.userid;

  if (!userId) return { success: false, message: "请先登录" };

  try {
    // 检查是否已收藏
    const existing = await prisma.podcast_favorites.findUnique({
      where: {
        userid_podcastid: {
          userid: userId,
          podcastid: podcastId,
        },
      },
    });

    if (existing) {
      // 取消收藏：删除记录 + 计数减 1
      await prisma.$transaction([
        prisma.podcast_favorites.delete({
          where: { favoriteid: existing.favoriteid },
        }),
        prisma.podcast.update({
          where: { podcastid: podcastId },
          data: { followerCount: { decrement: 1 } },
        }),
      ]);
    } else {
      // 添加收藏：创建记录 + 计数加 1
      await prisma.$transaction([
        prisma.podcast_favorites.create({
          data: {
            userid: userId,
            podcastid: podcastId,
          },
        }),
        prisma.podcast.update({
          where: { podcastid: podcastId },
          data: { followerCount: { increment: 1 } },
        }),
      ]);
    }

    if (pathname) revalidatePath(pathname);
    return { success: true, isFavorited: !existing };
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
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return { success: false, message: "请先登录" };

  try {
    const existing = await prisma.episode_favorites.findUnique({
      where: {
        userid_episodeid: {
          userid: userId,
          episodeid: episodeId,
        },
      },
    });

    if (existing) {
      await prisma.episode_favorites.delete({
        where: { favoriteid: existing.favoriteid },
      });
    } else {
      await prisma.episode_favorites.create({
        data: {
          userid: userId,
          episodeid: episodeId,
        },
      });
    }

    if (pathname) revalidatePath(pathname);
    return { success: true, isFavorited: !existing };
  } catch (error) {
    console.error("Toggle episode favorite error:", error);
    return { success: false, message: "操作失败" };
  }
}

export async function removePodcastFavoriteAction(podcastId: string) {
  try {
    const session = await auth();
    if (!session?.user?.userid) {
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
    const session = await auth();
    if (!session?.user?.userid) {
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
