import prisma from "@/lib/prisma";
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfDay,
  subDays,
  isSameDay,
} from "date-fns";
import { UpdateUserActivityDto, UserHomeStatsDto } from "./dto";
import { Prisma } from "@prisma/client";

export const statsService = {
  /**
   * 处理用户活跃更新 (核心写逻辑)
   * 包含：更新用户在线状态 + 累加每日收听时长
   */
  async updateDailyActivity(dto: UpdateUserActivityDto): Promise<void> {
    const { userId, seconds = 0 } = dto;
    const today = startOfDay(new Date());

    // 使用事务保证原子性
    await prisma.$transaction(async (tx) => {
      // 1. 更新用户最后活跃时间 (User 表)
      await tx.user.update({
        where: { userid: userId },
        data: {
          lastActiveAt: new Date(),
          isOnline: true,
        },
      });

      // 2. 更新每日活动日志 (UserDailyActivity 表)
      // 先尝试查找今天的记录
      const dailyActivity = await tx.user_daily_activity.findUnique({
        where: {
          userid_date: {
            userid: userId,
            date: today,
          },
        },
      });

      if (dailyActivity) {
        // 如果记录存在，累加时长并重新评估是否达标
        const newTotal = dailyActivity.listeningSeconds + seconds;
        // 达标阈值：5分钟 (300秒)
        const isActive = newTotal >= 300;

        await tx.user_daily_activity.update({
          where: { id: dailyActivity.id },
          data: {
            listeningSeconds: newTotal,
            isActive: isActive,
          },
        });
      } else {
        // 如果记录不存在，创建新记录
        await tx.user_daily_activity.create({
          data: {
            userid: userId,
            date: today,
            listeningSeconds: seconds,
            isActive: seconds >= 300,
            wordsLearned: 0,
          },
        });
      }
    });
  },

  /**
   * 获取用户首页统计数据 (读逻辑)
   */
  async getUserHomeStats(userId: string): Promise<UserHomeStatsDto> {
    const now = new Date();

    // 1. 将所有返回 number 的请求打包 (同构类型，TS 自动推断无压力)
    const numbersPromise = Promise.all([
      this.calculateStreak(userId),
      this.getWeeklyListeningSeconds(userId, now),
      this.getWeeklyListeningSeconds(userId, subWeeks(now, 1)),
      this.getWeeklyWordsCount(userId, now),
    ]);

    const activityPromise = this.getTodayActivity(userId);

    // 2. 【分别等待结果】
    // 这种写法彻底避开了 Promise.all 对混合类型的推断报错
    // 因为 numbersPromise 和 activityPromise 已经在后台并行跑了，所以这里分别 await 不会降低速度
    const [
      streakDays,
      thisWeekListeningSeconds,
      lastWeekListeningSeconds,
      thisWeekWordsCount,
    ] = await numbersPromise;

    const todayActivity = await activityPromise;

    // 计算逻辑
    const dailyGoalMins = 30;
    const todaySeconds = todayActivity?.listeningSeconds || 0;
    const todayMins = Math.floor(todaySeconds / 60);
    const remainingMins = Math.max(0, dailyGoalMins - todayMins);

    const listeningTimeCurrent = parseFloat(
      (thisWeekListeningSeconds / 3600).toFixed(1),
    );
    const listeningTimeGoal = 5;

    let weeklyProgress = 0;
    if (lastWeekListeningSeconds > 0) {
      weeklyProgress = Math.round(
        ((thisWeekListeningSeconds - lastWeekListeningSeconds) /
          lastWeekListeningSeconds) *
          100,
      );
    } else if (thisWeekListeningSeconds > 0) {
      weeklyProgress = 100;
    }

    return {
      streakDays,
      dailyGoalMins,
      remainingMins,
      weeklyProgress,
      listeningTimeCurrent,
      listeningTimeGoal,
      wordsLearnedCurrent: thisWeekWordsCount,
      wordsLearnedGoal: 50,
    };
  },

  // --- 私有辅助方法 (Private Helpers) ---

  async calculateStreak(userId: string): Promise<number> {
    const activities = await prisma.user_daily_activity.findMany({
      where: {
        userid: userId,
        isActive: true,
      },
      orderBy: {
        date: Prisma.SortOrder.desc,
      },
      take: 60,
    });

    if (activities.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    const yesterday = subDays(today, 1);
    const latestDate = activities[0].date;

    // 如果最近一次打卡不是今天也不是昨天，说明断签了
    if (!isSameDay(latestDate, today) && !isSameDay(latestDate, yesterday)) {
      return 0;
    }

    let currentDate = latestDate;
    for (const activity of activities) {
      if (isSameDay(activity.date, currentDate)) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else {
        break;
      }
    }
    return streak;
  },

  async getWeeklyListeningSeconds(
    userId: string,
    dateInWeek: Date,
  ): Promise<number> {
    const start = startOfWeek(dateInWeek, { weekStartsOn: 1 });
    const end = endOfWeek(dateInWeek, { weekStartsOn: 1 });

    const result = await prisma.user_daily_activity.aggregate({
      where: {
        userid: userId,
        date: {
          gte: start,
          lte: end,
        },
      },
      _sum: { listeningSeconds: true } as const,
    });

    return result._sum.listeningSeconds || 0;
  },

  async getTodayActivity(userId: string) {
    const today = startOfDay(new Date());
    return prisma.user_daily_activity.findUnique({
      where: {
        userid_date: { userid: userId, date: today },
      },
    });
  },

  async getWeeklyWordsCount(userId: string, dateInWeek: Date): Promise<number> {
    const start = startOfWeek(dateInWeek, { weekStartsOn: 1 });
    return prisma.vocabulary.count({
      where: {
        userid: userId,
        addedDate: { gte: start },
      },
    });
  },
};
