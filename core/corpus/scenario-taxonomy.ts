// yuanlu/core/corpus/scenario-taxonomy.ts

/**
 * [M2/T2.3] 受控场景枚举（≤30，双端同源：4090 标注 prompt / weapp 场景胶囊 / 检索 facet 共用）。
 * 裁决口径：CORPUS §一 #1——scenario_tag 收敛为受控枚举，替换现 situationTag 的剧集 tag 污染。
 * 变更纪律：新增/改名须评审（枚举即 API 契约）；key 稳定不改义。
 */
export interface ScenarioEnum {
  key: string;
  zh: string;
}

export const SCENARIO_TAXONOMY: ScenarioEnum[] = [
  { key: "daily_smalltalk", zh: "日常寒暄" },
  { key: "dining", zh: "餐饮点单" },
  { key: "shopping", zh: "购物消费" },
  { key: "travel", zh: "旅行出行" },
  { key: "lodging", zh: "住宿租房" },
  { key: "health", zh: "健康医疗" },
  { key: "workplace", zh: "职场办公" },
  { key: "interview", zh: "面试求职" },
  { key: "meeting", zh: "会议讨论" },
  { key: "phone_call", zh: "电话沟通" },
  { key: "complaints", zh: "客服投诉" },
  { key: "learning", zh: "学习教育" },
  { key: "pronunciation", zh: "发音语流" },
  { key: "emotions", zh: "情感表达" },
  { key: "social", zh: "人际社交" },
  { key: "family", zh: "家庭生活" },
  { key: "hobbies", zh: "兴趣爱好" },
  { key: "fitness", zh: "运动健身" },
  { key: "money", zh: "金钱财务" },
  { key: "tech", zh: "科技数码" },
  { key: "news", zh: "新闻时事" },
  { key: "culture", zh: "文化艺术" },
  { key: "entertainment", zh: "影视娱乐" },
  { key: "music", zh: "音乐" },
  { key: "sports", zh: "体育赛事" },
  { key: "science", zh: "科学自然" },
  { key: "environment", zh: "环境气候" },
  { key: "history", zh: "历史故事" },
  { key: "psychology", zh: "心理成长" },
  { key: "city_life", zh: "城市生活" },
];

export const SCENARIO_KEYS = SCENARIO_TAXONOMY.map((s) => s.key);
export const SCENARIO_KEY_SET = new Set(SCENARIO_KEYS);

/** key → 中文（未知 key 返回 null——枚举外一律拒绝落库） */
export function scenarioZh(key: string): string | null {
  return SCENARIO_TAXONOMY.find((s) => s.key === key)?.zh ?? null;
}
