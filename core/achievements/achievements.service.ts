import prisma from "@/lib/prisma";
import { statsService } from "@/core/stats/stats.service";
import { ACHIEVEMENT_LIST } from "./constants";
import { AchievementItemDto } from "./dto";

export const achievementsService = {
  /**
   * 获取用户成就列表（自动触发检查逻辑）
   */
  async getUserAchievements(userId: string): Promise<AchievementItemDto[]> {
    // 1. 获取用户当前的各项统计数据 (利用现有的 StatsService)
    const stats = await statsService.getUserProfileStats(userId);

    // 2. 获取数据库中已有的成就记录
    const earnedRecords = await prisma.achievements.findMany({
      where: { userid: userId },
    });
    const earnedKeys = new Set(earnedRecords.map((r) => r.achievementName));

    // 3. 检查是否有新成就可以解锁 (Lazy Evaluation)
    const newAchievements: string[] = [];
    const now = new Date();

    for (const achievement of ACHIEVEMENT_LIST) {
      if (earnedKeys.has(achievement.key)) continue; // 已拥有，跳过

      let isQualified = false;

      switch (achievement.conditionType) {
        case "streak":
          isQualified = stats.streakDays >= achievement.threshold;
          break;
        case "words":
          isQualified = stats.wordsLearned >= achievement.threshold;
          break;
        case "hours":
          isQualified = stats.totalHours >= achievement.threshold;
          break;
        case "manual":
          // 手动触发的成就在此不做检查，需由特定业务动作触发
          isQualified = false;
          break;
      }

      if (isQualified) {
        newAchievements.push(achievement.key);
      }
    }

    // 4. 如果有新成就，批量写入数据库
    if (newAchievements.length > 0) {
      await prisma.achievements.createMany({
        data: newAchievements.map((key) => ({
          userid: userId,
          achievementName: key,
          achievementDate: now,
        })),
        skipDuplicates: true, // 防止并发时的重复写入
      });

      // 更新内存中的已拥有列表，以便立即返回给前端
      newAchievements.forEach((key) => earnedKeys.add(key));
    }

    // 5. 组装返回数据 (合并静态定义与动态状态)
    // 按照我们在 constants 里定义的顺序返回，或者你可以把解锁的排在前面
    return ACHIEVEMENT_LIST.map((def) => {
      const isUnlocked = earnedKeys.has(def.key);
      // 查找对应的解锁时间（如果是刚解锁的，就是 now）
      const record = earnedRecords.find((r) => r.achievementName === def.key);
      const unlockedAt = record?.achievementDate
        ? record.achievementDate.toISOString()
        : newAchievements.includes(def.key)
          ? now.toISOString()
          : null;

      return {
        key: def.key,
        name: def.name,
        description: def.description,
        icon: def.icon,
        unlocked: isUnlocked,
        unlockedAt: unlockedAt,
      };
    });
  },
};
