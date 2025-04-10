import cron from "node-cron";
import { prisma } from "@/app/lib/prisma";

// 每5分钟执行一次, 更新30分钟前的用户状态为离线
cron.schedule("*/5 * * * *", async () => {
  const threshold = new Date(Date.now() - 30 * 60 * 1000); // 30分钟前
  await prisma.user.updateMany({
    where: {
      lastActiveAt: { lt: threshold },
      isOnline: true,
    },
    data: { isOnline: false },
  });
  console.log("Updated inactive users to offline");
});
