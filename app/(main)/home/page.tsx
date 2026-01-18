import { Metadata } from "next";
import { auth } from "@/auth";
import HomeClient from "@/components/main/home/HomeClient";
import { statsService } from "@/core/stats/stats.service";
import { listeningHistoryService } from "@/core/listening-history/listening-history.service";
import { ResumeData } from "@/components/main/home/ResumeButton";
import { RecentHistoryItemDto } from "@/core/listening-history/dto";
import { RecommendedEpisodeDto } from "@/core/episode/dto/recommended-episode.dto";
import { episodeService } from "@/core/episode/episode.service";

export const metadata: Metadata = {
  title: "我的主页 | 远路",
  description: "查看你的学习进度和个性化推荐。",
};

export default async function HomePage() {
  const session = await auth();
  const user = session?.user;

  let latestHistory: ResumeData | null = null;
  // 用于继续收听列表的数据
  let recentHistoryList: RecentHistoryItemDto[] = [];
  let userStats = null;
  // 推荐数据
  let recommendedData = {
    level: "General",
    items: [] as RecommendedEpisodeDto[],
  };

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

    const recommendedPromise = episodeService
      .getRecommendedEpisodes(user.userid) // 获取推荐
      .catch(() => ({ level: "General", items: [] }));

    console.log("STATS_PROMISE: ", statsPromise);

    userStats = await statsPromise;
    const history = await historyPromise;
    recommendedData = await recommendedPromise;

    if (history && history.length > 0) {
      // 1. 第一条给 Welcome Section 的 ResumeButton
      const first = history[0];
      latestHistory = {
        episodeId: first.episodeId,
        title: first.title,
        author: first.author,
        coverUrl: first.coverUrl,
        audioUrl: first.audioUrl,
        progress: first.progress,
        progressSeconds: first.progressSeconds, // ResumeButton 需要秒数
        duration: first.duration,
        isFinished: first.isFinished,
      } as unknown as ResumeData;

      // 2. 剩余的给 ContinueListening 组件
      recentHistoryList = history.slice(1);
    } else {
      // 未登录用户的兜底推荐
      recommendedData = await episodeService
        .getRecommendedEpisodes(undefined)
        .catch(() => ({ level: "General", items: [] }));
    }
  }

  return (
    <HomeClient
      user={user}
      latestHistory={latestHistory}
      userStats={userStats}
      recentHistory={recentHistoryList} // 传递剩余历史记录
      recommendedEpisodes={recommendedData.items}
      recommendedLevel={recommendedData.level}
    />
  );
}
