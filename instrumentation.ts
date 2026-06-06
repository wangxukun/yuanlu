/**
 * Next.js Instrumentation Hook
 * 在服务器启动时注册定时任务，用于清理离线用户状态。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/sessionCleaner");
    console.log("[Instrumentation] Session cleaner cron job registered.");
  }
}
