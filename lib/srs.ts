import { addDays } from "date-fns";

/**
 * 简单的间隔重复算法 (基于 Leitner System 适配现有 Schema)
 * 利用 proficiency 字段作为“当前等级”
 * * 等级(proficiency) -> 复习间隔:
 * 0: 新词/忘记 -> 0天 (今日需再次复习或明日)
 * 1: -> 1天
 * 2: -> 3天
 * 3: -> 7天
 * 4: -> 14天
 * 5: -> 30天
 * 6+: -> 90天 (长期掌握)
 */
const INTERVALS = [0, 1, 3, 7, 14, 30, 90];

export enum ReviewQuality {
  FORGOT = 0, // 忘记
  HARD = 1, // 模糊/困难
  GOOD = 2, // 认识
  EASY = 3, // 简单 (可以直接跳级，本版简化为同 GOOD)
}

interface SrsResult {
  proficiency: number;
  nextReviewAt: Date;
}

export function calculateNextReview(
  currentProficiency: number,
  quality: number,
): SrsResult {
  let nextProficiency = currentProficiency;
  let nextReviewDate = new Date();

  // 1. 如果用户忘记了 (FORGOT)
  if (quality === ReviewQuality.FORGOT) {
    // 惩罚：重置回 0 级（或者你可以选择降级 Math.max(0, current - 2)）
    nextProficiency = 0;
    // 策略：忘记的词，建议 10 分钟后或者明天再看。
    // 这里设置为当前时间，意味着它仍会出现在“今日待复习”列表中，直到用户选“认识”
    // 为了避免死循环，这里我们简单设为明天，或者设为 0 天后但前端过滤
    // * 建议策略：设为 0，且前端 UI 在完成一轮后询问是否重试“忘记”的词
    nextReviewDate = new Date();
  }
  // 2. 如果觉得困难 (HARD)
  else if (quality === ReviewQuality.HARD) {
    // 保持现状或稍微倒退
    nextProficiency = Math.max(0, currentProficiency - 1);
    nextReviewDate = addDays(new Date(), 1); // 强制明天复习
  }
  // 3. 如果认识 (GOOD / EASY)
  else {
    // 升级
    nextProficiency = currentProficiency + 1;

    // 获取对应的间隔天数
    // 如果等级超过了数组长度，就取最后一个（90天）
    const intervalIndex = Math.min(nextProficiency, INTERVALS.length - 1);
    const daysToAdd = INTERVALS[intervalIndex];

    nextReviewDate = addDays(new Date(), daysToAdd);
  }

  return {
    proficiency: nextProficiency,
    nextReviewAt: nextReviewDate,
  };
}
