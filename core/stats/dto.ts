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
  /** 累计语音评测次数（口语类成就判定用） */
  speechEvalCount: number;
  /** 综合分 ≥85 的评测次数（口语类成就判定用） */
  speechHighScoreCount: number;
}

// 每周活动图表 - 每日数据项
export interface WeeklyActivityItemDto {
  day: string; // 星期几的中文简称（如"周一"）
  minutes: number; // 当日学习分钟数
}

// 每周活动图表数据
export interface WeeklyActivityDto {
  weeklyActivity: WeeklyActivityItemDto[];
}
