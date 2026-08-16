export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string; // 使用 Emoji 或图片路径
  conditionType:
    | "streak"
    | "words"
    | "hours"
    | "manual"
    | "speechCount"
    | "speechHighScore";
  threshold: number;
}

export const ACHIEVEMENT_RULES: Record<string, AchievementDef> = {
  // --- 连续打卡类 ---
  STREAK_3: {
    key: "STREAK_3",
    name: "初露锋芒",
    description: "连续学习打卡 3 天",
    icon: "🌱",
    conditionType: "streak",
    threshold: 3,
  },
  STREAK_7: {
    key: "STREAK_7",
    name: "坚持不懈",
    description: "连续学习打卡 7 天",
    icon: "🔥",
    conditionType: "streak",
    threshold: 7,
  },
  STREAK_30: {
    key: "STREAK_30",
    name: "习惯成自然",
    description: "连续学习打卡 30 天",
    icon: "🗓️",
    conditionType: "streak",
    threshold: 30,
  },

  // --- 词汇积累类 ---
  VOCAB_50: {
    key: "VOCAB_50",
    name: "积少成多",
    description: "累计学习 50 个单词",
    icon: "📘",
    conditionType: "words",
    threshold: 50,
  },
  VOCAB_500: {
    key: "VOCAB_500",
    name: "词汇大师",
    description: "累计学习 500 个单词",
    icon: "📚",
    conditionType: "words",
    threshold: 500,
  },

  // --- 收听时长类 ---
  LISTEN_10H: {
    key: "LISTEN_10H",
    name: "磨耳朵",
    description: "累计收听 10 小时",
    icon: "🎧",
    conditionType: "hours",
    threshold: 10,
  },
  LISTEN_100H: {
    key: "LISTEN_100H",
    name: "资深听众",
    description: "累计收听 100 小时",
    icon: "🏆",
    conditionType: "hours",
    threshold: 100,
  },

  // --- 特殊类 (示例) ---
  EARLY_BIRD: {
    key: "EARLY_BIRD",
    name: "早起鸟",
    description: "在上午 8 点前完成一次学习",
    icon: "🌅",
    conditionType: "manual", // 需要在业务逻辑中手动触发
    threshold: 1,
  },

  // --- 口语评测类 (VOICE-EVALUATION 阶段四·任务1) ---
  SPEECH_1: {
    key: "SPEECH_1",
    name: "开口先锋",
    description: "完成首次语音评测",
    icon: "🎤",
    conditionType: "speechCount",
    threshold: 1,
  },
  SPEECH_50: {
    key: "SPEECH_50",
    name: "勤学苦练",
    description: "累计完成 50 次语音评测",
    icon: "💬",
    conditionType: "speechCount",
    threshold: 50,
  },
  SPEECH_100: {
    key: "SPEECH_100",
    name: "百炼成钢",
    description: "累计完成 100 次语音评测",
    icon: "🗣️",
    conditionType: "speechCount",
    threshold: 100,
  },
  SPEECH_GREAT_10: {
    key: "SPEECH_GREAT_10",
    name: "出口成章",
    description: "累计 10 次评测综合分不低于 85",
    icon: "✨",
    conditionType: "speechHighScore",
    threshold: 10,
  },
  SPEECH_GREAT_100: {
    key: "SPEECH_GREAT_100",
    name: "口语达人",
    description: "累计 100 次评测综合分不低于 85",
    icon: "🏅",
    conditionType: "speechHighScore",
    threshold: 100,
  },
};

export const ACHIEVEMENT_LIST = Object.values(ACHIEVEMENT_RULES);
