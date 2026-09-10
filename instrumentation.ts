/**
 * Next.js Instrumentation Hook
 * 在服务器启动时注册定时任务，用于清理离线用户状态。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/sessionCleaner");
    await import("@/lib/cleanupCron");
    console.log(
      "[Instrumentation] Session cleaner and data cleanup cron jobs registered.",
    );
  }
}
