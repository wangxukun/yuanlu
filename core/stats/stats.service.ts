import prisma from "@/lib/prisma";
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfDay,
  subDays,
  isSameDay,
} from "date-fns";
import {
  UpdateUserActivityDto,
  UserHomeStatsDto,
  UserProfileStatsDto,
} from "./dto";
import { Prisma } from "@prisma/client";

export const statsService = {
  /**
   * 处理用户活跃更新 (核心写逻辑)
   * 优化：移除 $transaction 以防止在高并发页面（如播放页）出现 P2028 事务超时错误
   * 逻辑：独立执行 User 更新和 UserDailyActivity 更新，互不阻塞
   */
  async updateDailyActivity(dto: UpdateUserActivityDto): Promise<void> {
    const { userId, seconds = 0 } = dto;
    // [健壮性修复] 确保秒数是整数。
    // 因为 user_daily_activity 表的 listeningSeconds 是 Int 类型。
    // 即使前端传来浮点数，这里也会安全地处理，避免 Prisma 报错。
    const safeSeconds = Math.round(seconds);
    const today = startOfDay(new Date()); // 获取今天00:00:00.000

    // 1. 更新用户最后活跃时间 (User 表)
    // 使用 Promise.allSettled 或独立的 try-catch 确保即使这步失败（极少见），也不影响下面的统计数据
    const updateUserPromise = prisma.user
      .update({
        where: { userid: userId },
        data: {
          lastActiveAt: new Date(),
          isOnline: true,
        },
      })
      .catch((e) => {
        console.warn(`[Stats] Update user online status failed: ${e.message}`);
      });

    // 2. 更新每日活动日志 (UserDailyActivity 表)
    // [优化] 保持使用 upsert 的原子性 increment 操作
    const updateActivityPromise = prisma.user_daily_activity.upsert({
      where: {
        userid_date: {
          userid: userId,
          date: today,
        },
      },
      create: {
        userid: userId,
        date: today,
        listeningSeconds: safeSeconds,
        isActive: safeSeconds >= 300,
        wordsLearned: 0,
      },
      update: {
        listeningSeconds: { increment: safeSeconds },
      },
    });

    // 并行执行以减少接口响应时间
    const [, updatedActivity] = await Promise.all([
      updateUserPromise,
      updateActivityPromise,
    ]);

    // 3. 检查并更新达标状态 (isActive)
    // 只有当 activity 更新成功且状态需要变更时才执行
    if (
      updatedActivity &&
      !updatedActivity.isActive &&
      updatedActivity.listeningSeconds >= 300
    ) {
      try {
        await prisma.user_daily_activity.update({
          where: { id: updatedActivity.id },
          data: { isActive: true },
        });
      } catch (e) {
        console.warn(`[Stats] Update isActive failed: ${e}`);
        // 忽略此错误，下次心跳会再次检查
      }
    }
  },

  /**
   * 获取个人中心概览统计数据 (总时长、连续天数、总词汇)
   */
  async getUserProfileStats(userId: string): Promise<UserProfileStatsDto> {
    const [streakDays, totalSecondsResult, wordsCount] = await Promise.all([
      this.calculateStreak(userId),
      prisma.user_daily_activity.aggregate({
        where: { userid: userId },
        _sum: { listeningSeconds: true },
      }),
      prisma.vocabulary.count({
        where: { userid: userId },
      }),
    ]);

    const totalListeningSeconds = totalSecondsResult._sum.listeningSeconds || 0;
    const totalHours = Math.round(totalListeningSeconds / 3600);

    return {
      totalHours,
      streakDays,
      wordsLearned: wordsCount,
    };
  },

  /**
   * 获取用户首页统计数据 (读逻辑)
   */
  async getUserHomeStats(userId: string): Promise<UserHomeStatsDto> {
    const now = new Date();

    const numbersPromise = Promise.all([
      this.calculateStreak(userId),
      this.getWeeklyListeningSeconds(userId, now),
      this.getWeeklyListeningSeconds(userId, subWeeks(now, 1)),
      this.getWeeklyWordsCount(userId, now),
    ]);
    const userProfilePromise = prisma.user_profile.findUnique({
      where: { userid: userId },
      select: {
        dailyStudyGoalMins: true,
        weeklyListeningGoalHours: true,
        weeklyWordsGoal: true,
      },
    });
    const activityPromise = this.getTodayActivity(userId);

    const [
      streakDays,
      thisWeekListeningSeconds,
      lastWeekListeningSeconds,
      thisWeekWordsCount,
    ] = await numbersPromise;
    const userProfile = await userProfilePromise;
    const todayActivity = await activityPromise;

    const dailyGoalMins = userProfile?.dailyStudyGoalMins || 20;
    const listeningTimeGoal = userProfile?.weeklyListeningGoalHours || 2;
    const wordsLearnedGoal = userProfile?.weeklyWordsGoal || 50;

    const todaySeconds = todayActivity?.listeningSeconds || 0;
    const todayMins = Math.floor(todaySeconds / 60);
    const remainingMins = Math.max(0, dailyGoalMins - todayMins);

    const listeningTimeCurrent = parseFloat(
      (thisWeekListeningSeconds / 3600).toFixed(1),
    );

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
      wordsLearnedGoal,
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
