import { auth } from "@/auth";
import { listeningHistoryService } from "@/core/listening-history/listening-history.service";
import HomeClient from "./HomeClient";

// 标记为 Server Component (默认就是)
export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.userid;
  let latestHistory = null;

  // 如果已登录，获取最近播放记录
  if (userId) {
    try {
      latestHistory = await listeningHistoryService.getLatestHistory(userId);
    } catch (error) {
      console.error("Failed to fetch latest history for home page:", error);
      // 出错时不中断页面渲染，latestHistory 保持为 null
    }
  }

  // 将服务端获取的数据传给客户端组件
  // 注意：session.user 可能类型不完全匹配，根据实际 auth.ts 定义调整，或者直接传 session.user
  return <HomeClient user={session?.user} latestHistory={latestHistory} />;
}
