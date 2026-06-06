/**
 * Next.js Instrumentation Hook
 * 在服务器启动时注册定时任务，用于清理离线用户状态。
 *
 * 重要：此文件使用 Node.js 内置的 createRequire 来创建原生 require 函数，
 * 完全绕过 Turbopack 的模块解析和 hash 别名机制。
 * Turbopack 会对 instrumentation hook 依赖树中的外部包（如 @prisma/client、node-cron）
 * 生成带 hash 后缀的别名引用（例如 @prisma/client-2c3a...），导致运行时找不到模块。
 * createRequire 创建的 require 是 Node.js 原生的，不经过 Turbopack 的 externalRequire。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // 使用 Node.js 原生模块系统，完全绕过 Turbopack 的 externalRequire 机制
    const { createRequire } = await import("node:module");
    const { join } = await import("node:path");
    const nativeRequire = createRequire(join(process.cwd(), "package.json"));

    const cron = nativeRequire("node-cron");
    const { PrismaClient } = nativeRequire("@prisma/client");

    const prisma = new PrismaClient();

    // 每5分钟执行一次, 更新30分钟前的用户状态为离线
    cron.schedule("*/5 * * * *", async () => {
      const threshold = new Date(Date.now() - 30 * 60 * 1000);
      try {
        await prisma.user.updateMany({
          where: {
            lastActiveAt: { lt: threshold },
            isOnline: true,
          },
          data: { isOnline: false },
        });
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          "code" in err &&
          (err as Error & { code: string }).code === "P2025"
        ) {
          console.log("No inactive users found");
        }
      }
    });

    console.log("[Instrumentation] Session cleaner cron job registered.");
  }
}
