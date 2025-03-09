// 客户端组件更新用户活动时间
import { useEffect } from "react";
export async function updateActivityInClient() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  useEffect(() => {
    const updateActivity = async () => {
      await fetch(`${baseUrl}/api/auth/update-activity`, { method: "POST" });
    };
    updateActivity();
    const interval = setInterval(updateActivity, 60000); // 每分钟更新一次
    return () => clearInterval(interval);
  }, []);
}
