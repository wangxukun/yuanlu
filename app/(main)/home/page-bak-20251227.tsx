import { auth } from "@/auth";
import { listeningHistoryService } from "@/core/listening-history/listening-history.service";
import { statsService } from "@/core/stats/stats.service";
import HomeClient from "@/components/main/home/HomeClient";

// 标记为 Server Component
export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.userid;

  // 1. 【并行启动请求】
  // Promise 创建即开始执行，互不阻塞。
  // 我们手动处理 userId 为空的情况，返回 Promise.resolve(null)
  const historyPromise = userId
    ? listeningHistoryService.getLatestHistory(userId).catch((e) => {
        console.error("Fetch history failed", e);
        return null;
      })
    : Promise.resolve(null);

  const statsPromise = userId
    ? statsService.getUserHomeStats(userId).catch((e) => {
        console.error("Fetch stats failed", e);
        return null;
      })
    : Promise.resolve(null);

  // 2. 【分别等待结果】
  // TypeScript 能完美推断每个变量的具体类型，不会混淆。
  // 并且因为请求已经在上面同时发出了，这里 await 的总耗时依然取决于最慢的那个请求（并行效果）。
  const latestHistory = await historyPromise;
  const userStats = await statsPromise;

  return (
    <HomeClient
      user={session?.user}
      latestHistory={latestHistory}
      userStats={userStats}
    />
  );
}
