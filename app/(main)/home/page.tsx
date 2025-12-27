import { auth } from "@/auth";
import HomeClient from "@/components/main/home/HomeClient";
import { statsService } from "@/core/stats/stats.service";
import { listeningHistoryService } from "@/core/listening-history/listening-history.service";
import { ResumeData } from "@/components/main/home/ResumeButton";
import { RecentHistoryItemDto } from "@/core/listening-history/dto";

export default async function HomePage() {
  const session = await auth();
  const user = session?.user;

  let latestHistory: ResumeData | null = null;
  // [新增] 用于继续收听列表的数据
  let recentHistoryList: RecentHistoryItemDto[] = [];
  let userStats = null;

  if (user?.userid) {
    const statsPromise = statsService
      .getUserHomeStats(user.userid)
      .catch((e) => {
        console.error("Fetch stats failed", e);
        return null;
      });

    // 获取前 4 条记录
    const historyPromise = listeningHistoryService
      .getRecentHistory(user.userid, 4)
      .catch((e) => {
        console.error("Fetch history failed", e);
        return [];
      });

    userStats = await statsPromise;
    const history = await historyPromise;

    if (history.length > 0) {
      // 1. 第一条给 Welcome Section 的 ResumeButton
      const first = history[0];
      latestHistory = {
        episodeId: first.episodeId,
        title: first.title,
        coverUrl: first.coverUrl,
        audioUrl: first.audioUrl,
        progress: first.progress,
        progressSeconds: first.progressSeconds, // ResumeButton 需要秒数
        duration: first.duration,
      } as unknown as ResumeData;

      // 2. 剩余的给 ContinueListening 组件
      recentHistoryList = history.slice(1);
      console.log("recentHistoryList", recentHistoryList);
    }
  }

  return (
    <HomeClient
      user={user}
      latestHistory={latestHistory}
      userStats={userStats}
      recentHistory={recentHistoryList} // [新增] 传递剩余历史记录
    />
  );
}
