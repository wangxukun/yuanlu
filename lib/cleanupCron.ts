/**
 * 定时任务
 * 定期清理数据库中过期的业务验证数据（验证码等）
 */
import cron from "node-cron";
import { cleanupExpiredAuthData } from "@/core/auth/cleanup.service";
import {
  cleanupExpiredSpeechMedia,
  DEFAULT_SPEECH_MEDIA_RETENTION_DAYS,
} from "@/core/speech/speech-cleanup.service";

// 每天凌晨 3:00 执行一次过期数据的清理
cron.schedule("0 3 * * *", async () => {
  console.log("[Cron] 正在执行每日过期业务数据清理任务...");
  await cleanupExpiredAuthData();
});

// [存储优化] 每天凌晨 3:30 跟读录音 OSS 对账清理：
// 与 Bucket 生命周期规则（yuanlu/speech/ 前缀 91 天，控制台配置）配套，
// 把超期行的 userAudioUrl/detailUrl 置空，避免对已删对象签名下发。
// 保留天数须比生命周期小 1 天（默认 90），可用 SPEECH_MEDIA_RETENTION_DAYS 覆盖
// （覆盖时同样保持"生命周期 - 1"关系）。
cron.schedule("30 3 * * *", async () => {
  const days = Number(process.env.SPEECH_MEDIA_RETENTION_DAYS);
  const retentionDays =
    Number.isFinite(days) && days > 0
      ? Math.floor(days)
      : DEFAULT_SPEECH_MEDIA_RETENTION_DAYS;
  console.log(`[Cron] 正在清理 ${retentionDays} 天前的跟读录音 OSS 文件...`);
  try {
    const result = await cleanupExpiredSpeechMedia(retentionDays);
    console.log("[Cron] 跟读录音清理完成:", JSON.stringify(result));
  } catch (e) {
    console.error("[Cron] 跟读录音清理失败:", e);
  }
});
