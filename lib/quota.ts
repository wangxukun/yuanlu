/**
 * 免费用户功能配额常量（会员/管理员不受限制）。
 *
 * 会员判断统一使用 core/auth/guard 中的 isPremiumUser（角色 + 有效订阅）。
 * 这些常量同时被服务端（API 路由 / Server Actions）与客户端（配额提示）引用，
 * 修改上限时只需改这里。
 */

/** 免费用户生词本总量上限（超过后禁止新增，可删除旧词腾出空间） */
export const FREE_VOCABULARY_LIMIT = 50;

/** 免费用户每天最多新增的生词数 */
export const FREE_VOCABULARY_DAILY_LIMIT = 5;

/**
 * 免费用户每日词典查询次数（点词查词/翻译/朗读，含有道 API 与 LLM 词典）。
 * 覆盖正常学习用量（一集查十几词），会员不限。
 */
export const FREE_DICTIONARY_DAILY_LIMIT = 30;

/** 免费用户每个自然月可使用的语音评测次数（学新场景：剧集页沉浸跟读） */
export const FREE_SPEECH_EVALUATIONS_PER_MONTH = 20;

/**
 * [P3-b] 免费用户每日复习场景语音评测次数（发音弱项闯关 / 句子本影子跟读）。
 * 复习是闭环留存动作，与学新月池独立计数（评测双池拆分，报告 4.2-B）。
 */
export const FREE_REVIEW_EVALUATIONS_PER_DAY = 5;

/**
 * [P3-b] 复习日池触墙缓冲（5+1，报告建议值）：对外承诺 5 次/日，
 * 实际放行 6 次后才拦截，缓冲"第 5 次刚好卡在兴头上"的断崖感；
 * remaining 展示含缓冲（真实可评次数），触墙文案仍按承诺口径 5 次。
 */
export const REVIEW_EVAL_DAILY_BUFFER = 1;

/**
 * 语音评测配额超限的错误码（学新月池触墙）。
 * 服务端在配额用尽时返回 { error: 该常量, message: 提示文案 }，
 * 客户端据此弹出会员升级弹窗而不是普通错误提示。
 */
export const SPEECH_QUOTA_EXCEEDED = "EVALUATION_QUOTA_EXCEEDED";

/**
 * [P3-b] 复习日池配额超限的错误码（evaluateSpeech / saveSpeechResult 返回），
 * 客户端据此弹 review_eval_quota 场景会员窗（与月池的 speech_quota 区分）。
 */
export const REVIEW_EVAL_QUOTA_EXCEEDED = "REVIEW_EVAL_QUOTA_EXCEEDED";

/** 生词配额超限的错误码（/api/vocabulary/add 返回），语义同上 */
export const VOCABULARY_QUOTA_EXCEEDED = "VOCABULARY_QUOTA_EXCEEDED";

/** 生词每日新增配额超限的错误码（/api/vocabulary/add 返回），语义同上 */
export const VOCABULARY_DAILY_QUOTA_EXCEEDED =
  "VOCABULARY_DAILY_QUOTA_EXCEEDED";

/**
 * [P3-a] 免费用户句子收藏总量上限（终身容量型，刻意不设每日新增限额——
 * 收藏发生在精听沉浸态，同一书签按钮两种失败模式不可理解，容量单一心智）。
 * 30 条 ≈ 深度使用 1-2 周收藏量，此时"收藏→刷句→跟读→弱项"闭环已被完整体验。
 */
export const FREE_SENTENCE_LIMIT = 30;

/** 句子收藏配额超限的错误码（sentences/toggle 与 server action 返回），
 * 语义同生词：客户端据此走"暂存 + 浮卡 + PremiumModal"承接而非普通报错 */
export const SENTENCE_QUOTA_EXCEEDED = "SENTENCE_QUOTA_EXCEEDED";

/**
 * [P3-a] 弱项本免费可见条数（试用切片）——自 pronunciation/page 与
 * speech/notebook 两处局部常量收编（报告 4.2-A 工程口径），
 * P3-c 将把切片逻辑一并收进 weak-sentences service。
 */
export const FREE_VISIBLE_ERRORS = 3;

/**
 * [P3-a] 80% 预告判定：达到容量 80%（第 24 条起）且未满时，
 * 收藏成功 toast 附带"还剩 {n} 个位置"（单集会话只提示一次）。
 */
export function shouldPreviewSentenceQuota(
  totalCount: number,
  limit: number = FREE_SENTENCE_LIMIT,
): boolean {
  return totalCount >= Math.ceil(limit * 0.8) && totalCount < limit;
}

/** 词典查询配额超限的错误码（有道词典 / LLM 词典接口返回），语义同上 */
export const DICTIONARY_QUOTA_EXCEEDED = "DICTIONARY_QUOTA_EXCEEDED";
