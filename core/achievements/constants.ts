export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string; // 使用 Emoji 或图片路径
  conditionType: "streak" | "words" | "hours" | "manual";
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
};

export const ACHIEVEMENT_LIST = Object.values(ACHIEVEMENT_RULES);
