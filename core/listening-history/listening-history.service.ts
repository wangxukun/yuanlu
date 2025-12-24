// core/listening-history/listening-history.service.ts
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateSignatureUrl } from "@/lib/oss";
import { ListeningHistoryItem } from "./dto";

// 简单的秒转时间字符串辅助函数
const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const listeningHistoryService = {
  /**
   * 获取用户的收听历史
   */
  async getUserHistory(userId: string): Promise<ListeningHistoryItem[]> {
    // 1. 定义查询条件对象，并使用 satisfies 确保符合 Prisma 类型
    // 这样既能获得自动补全，又能作为类型推断的依据
    const historyQuery = {
      where: {
        userid: userId,
      },
      orderBy: {
        listenAt: Prisma.SortOrder.desc,
      },
      include: {
        episode: {
          include: {
            podcast: {
              select: {
                title: true, // 作为 category
                platform: true, // 作为 author
              },
            },
          },
        },
      },
    } satisfies Prisma.listening_historyFindManyArgs;

    // 定义返回的原始数据类型
    type HistoryRaw = Prisma.listening_historyGetPayload<typeof historyQuery>;

    try {
      // 获取真实数据
      const history = await prisma.listening_history.findMany(historyQuery);

      // 2. 并行处理所有记录，主要为了异步获取签名 URL
      const processedHistory = await Promise.all(
        history.map(
          async (item: HistoryRaw): Promise<ListeningHistoryItem | null> => {
            const ep = item.episode;
            // 处理边缘情况：关联的剧集可能已被删除
            if (!ep) return null;

            let signedCoverUrl =
              ep.coverUrl || "/static/images/episode-light.png";

            // 获取剧集封面的签名 URL
            if (ep.coverFileName) {
              try {
                signedCoverUrl = await generateSignatureUrl(
                  ep.coverFileName,
                  3600 * 3, // 3小时有效期
                );
              } catch (e) {
                console.error(`Failed to sign url for episode ${ep.title}`, e);
                // 签名失败时回退到原始 coverUrl
                if (ep.coverUrl) signedCoverUrl = ep.coverUrl;
              }
            }

            return {
              historyid: item.historyid,
              listenAt: item.listenAt
                ? item.listenAt.toISOString()
                : new Date().toISOString(),
              progressSeconds: item.progressSeconds,
              isFinished: item.isFinished,
              episode: {
                id: ep.episodeid,
                title: ep.title,
                author: ep.podcast?.platform || "未知播客",
                category: ep.podcast?.title || "系列",
                thumbnailUrl: signedCoverUrl,
                duration: formatDuration(ep.duration),
                durationSeconds: ep.duration,
                level: "General",
              },
            };
          },
        ),
      );

      // 过滤掉 null 值 (即关联剧集已被删除的记录)
      return processedHistory.filter(
        (item): item is ListeningHistoryItem => item !== null,
      );
    } catch (error) {
      console.error("Failed to fetch user history:", error);
      return [];
    }
  },

  /**
   * 删除单条历史记录
   */
  async deleteHistory(userId: string, historyId: number) {
    const record = await prisma.listening_history.findFirst({
      where: { historyid: historyId, userid: userId },
    });

    if (!record) {
      throw new Error("记录不存在或无权删除");
    }

    const result = await prisma.listening_history.delete({
      where: { historyid: historyId },
    });
    return result;
  },

  /**
   * 清空用户所有历史记录
   */
  async clearAllHistory(userId: string) {
    const result = await prisma.listening_history.deleteMany({
      where: { userid: userId },
    });
    return result;
  },
};
