import prisma from "@/lib/prisma";
import { calculateNextReview } from "@/lib/srs";
import { Prisma } from "@prisma/client";

export const vocabularyService = {
  /**
   * 获取用户的所有生词（用于生词本列表展示）
   */
  async getAllVocabulary(userId: string) {
    const list = await prisma.vocabulary.findMany({
      where: {
        userid: userId,
      },
      include: {
        User: false,
        episode: {
          select: { title: true },
        },
      },
      orderBy: {
        addedDate: Prisma.SortOrder.desc,
      },
    });

    // 格式化数据以适应前端组件
    return list.map((item) => ({
      ...item,
      // 将 Prisma 的 Date 对象转换为 ISO 字符串，避免传给 Client Component 时序列化警告
      addedDate: item.addedDate ? item.addedDate.toISOString() : null,
      nextReviewAt: item.nextReviewAt ? item.nextReviewAt.toISOString() : null,
      episodeTitle: item.episode?.title || "未知剧集",
    }));
  },

  /**
   * 提交复习结果，更新单词状态
   */
  async submitReview(userId: string, vocabularyId: number, quality: number) {
    // 1. 查找单词并验证归属权
    const vocab = await prisma.vocabulary.findUnique({
      where: { vocabularyid: vocabularyId },
    });

    if (!vocab) {
      throw new Error("单词不存在");
    }

    if (vocab.userid !== userId) {
      throw new Error("无权操作此单词");
    }

    // 2. 使用算法计算新状态
    const { proficiency, nextReviewAt } = calculateNextReview(
      vocab.proficiency,
      quality,
    );

    // 3. 更新数据库
    const updatedVocab = await prisma.vocabulary.update({
      where: { vocabularyid: vocabularyId },
      data: {
        proficiency,
        nextReviewAt,
        // 如果表里有 updateAt 字段，Prisma 会自动更新，或者你可以手动记录最后复习时间
      },
    });

    return {
      vocabularyid: updatedVocab.vocabularyid,
      // [修复] 关键修改：将 Date 对象转换为 ISO 字符串
      nextReviewAt: updatedVocab.nextReviewAt
        ? updatedVocab.nextReviewAt.toISOString()
        : null,
      proficiency: updatedVocab.proficiency,
      // 计算增加了几天，用于前端反馈 "下次复习: 3天后"
      daysAdded: Math.round(
        (nextReviewAt.getTime() - new Date().getTime()) / (1000 * 3600 * 24),
      ),
    };
  },
};
