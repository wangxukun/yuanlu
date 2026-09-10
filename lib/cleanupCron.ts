/**
 * 定时任务
 * 定期清理数据库中过期的业务验证数据（验证码等）
 */
import cron from "node-cron";
import { cleanupExpiredAuthData } from "@/core/auth/cleanup.service";

// 每天凌晨 3:00 执行一次过期数据的清理
cron.schedule("0 3 * * *", async () => {
  console.log("[Cron] 正在执行每日过期业务数据清理任务...");
  await cleanupExpiredAuthData();
});
