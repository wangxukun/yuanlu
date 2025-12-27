export interface UpdateUserActivityDto {
  userId: string;
  /**
   * 增量收听时长 (秒)
   * 默认为 0，表示仅作为心跳保活
   */
  seconds?: number;
}

export interface UserHomeStatsDto {
  streakDays: number;
  dailyGoalMins: number;
  remainingMins: number;
  weeklyProgress: number;
  listeningTimeCurrent: number;
  listeningTimeGoal: number;
  wordsLearnedCurrent: number;
  wordsLearnedGoal: number;
}

// 个人中心概览统计数据
export interface UserProfileStatsDto {
  totalHours: number;
  streakDays: number;
  wordsLearned: number;
}
