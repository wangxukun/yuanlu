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

/** 免费用户每个自然月可使用的语音评测次数 */
export const FREE_SPEECH_EVALUATIONS_PER_MONTH = 10;

/**
 * 语音评测配额超限的错误码。
 * 服务端在配额用尽时返回 { error: 该常量, message: 提示文案 }，
 * 客户端据此弹出会员升级弹窗而不是普通错误提示。
 */
export const SPEECH_QUOTA_EXCEEDED = "EVALUATION_QUOTA_EXCEEDED";

/** 生词配额超限的错误码（/api/vocabulary/add 返回），语义同上 */
export const VOCABULARY_QUOTA_EXCEEDED = "VOCABULARY_QUOTA_EXCEEDED";

/** 词典查询配额超限的错误码（有道词典 / LLM 词典接口返回），语义同上 */
export const DICTIONARY_QUOTA_EXCEEDED = "DICTIONARY_QUOTA_EXCEEDED";
