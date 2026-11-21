/**
 * 每日学习时长目标兜底值（user_profile 记录缺失时使用）。
 * 打卡(isActive)判定与 getUserHomeStats 的进度展示必须使用同一来源，否则会出现
 * "目标显示 15 分钟、打卡却按 5 分钟生效" 的割裂。
 */
export const DEFAULT_DAILY_GOAL_MINS = 20;
