/**
 * 定时任务
 * 定时更新用户状态为离线
 */

import cron from "node-cron";
import prisma from "@/lib/prisma";

// 每5分钟执行一次, 更新30分钟前的用户状态为离线
cron.schedule("*/5 * * * *", async () => {
  const threshold = new Date(Date.now() - 30 * 60 * 1000); // 30分钟前
  try {
    await prisma.user.updateMany({
      where: {
        lastActiveAt: { lt: threshold },
        isOnline: true,
      },
      data: { isOnline: false },
    });
    await prisma.$disconnect();
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "P2025") {
      console.log("No inactive users found");
    }
  }
});
