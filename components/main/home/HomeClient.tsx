"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import PodcastAuthPrompt from "@/components/main/home/podcast-auth-prompt";
import ResumeButton, { ResumeData } from "@/components/main/home/ResumeButton";
import UserStatsCard from "@/components/main/home/UserStatsCard";
import ContinueListening from "@/components/main/home/ContinueListening";
import RecommendedPodcasts from "@/components/main/home/RecommendedPodcasts";
import RecentEpisodes from "@/components/main/home/RecentEpisodes";
import { UserHomeStatsDto } from "@/core/stats/dto";
import { RecentHistoryItemDto } from "@/core/listening-history/dto";
import { BoltIcon } from "@heroicons/react/24/solid";
import { User } from "next-auth";
import { RecommendedEpisodeDto } from "@/core/episode/dto/recommended-episode.dto";

interface HomeClientProps {
  user?: User;
  latestHistory: ResumeData | null;
  userStats: UserHomeStatsDto | null;
  recentHistory: RecentHistoryItemDto[];
  recommendedEpisodes: RecommendedEpisodeDto[];
  recommendedLevel: string;
  recentPublishedEpisodes: RecommendedEpisodeDto[];
}
export default function HomeClient({
  user,
  latestHistory,
  userStats,
  recentHistory,
  recommendedEpisodes,
  recommendedLevel,
  recentPublishedEpisodes,
}: HomeClientProps) {
  const router = useRouter();

  if (!user) {
    return <PodcastAuthPrompt />;
  }

  const displayName =
    user.nickname || user.name || user.email?.split("@")[0] || "朋友";

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "早上好" : currentHour < 18 ? "下午好" : "晚上好";

  const onPlayPodcast = (id: string) => {
    router.push(`/episode/${id}`);
  };

  const stats = userStats || {
    streakDays: 0,
    dailyGoalMins: 30,
    remainingMins: 30,
    weeklyProgress: 0,
    listeningTimeCurrent: 0,
    listeningTimeGoal: 5,
    wordsLearnedCurrent: 0,
    wordsLearnedGoal: 50,
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 space-y-10">
        {/* Welcome & Stats Hero */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          <div className="flex-1 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[24px] p-6 md:p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <BoltIcon className="w-32 h-32" />
            </div>

            <div className="relative z-10">
              <h1
                className="text-2xl md:text-3xl font-bold mb-2"
                suppressHydrationWarning
              >
                {greeting}, {displayName}!
              </h1>
              <p className="text-indigo-100 mb-6 max-w-md text-sm sm:text-base leading-relaxed">
                你已经连续坚持了<strong>{stats.streakDays}</strong>
                天！继续加油！
                <br />
                你的每日目标是{stats.dailyGoalMins}分钟，
                {stats.remainingMins <= 0
                  ? "今日目标已经完成！"
                  : "还剩" + stats.remainingMins + "分钟。"}
              </p>

              {/* [Responsive Layout Optimization]
                 Mobile: 使用 Flex 布局，将封面图放在左侧，按钮在右侧。
                 Desktop: 封面图隐藏（由外部 absolute 元素处理），只显示按钮。
              */}
              <div className="flex items-center gap-4">
                {/* Mobile Only Cover Image */}
                {latestHistory && (
                  <div className="block xl:hidden shrink-0">
                    <div className="relative w-32 aspect-[16/9] rounded-lg overflow-hidden">
                      <Image
                        src={
                          latestHistory.coverUrl ||
                          "/static/images/podcast-light.png"
                        }
                        alt="Podcast Cover"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="flex-1 sm:flex-none">
                  <ResumeButton latestHistory={latestHistory} />
                </div>
              </div>
            </div>

            {/* Desktop Only: Absolute Right Image */}
            {latestHistory && (
              <div className="absolute top-6 right-10 hidden xl:block">
                <Image
                  src={
                    latestHistory.coverUrl || "/static/images/podcast-light.png"
                  }
                  alt="Podcast"
                  width={516}
                  height={516}
                  className="w-48 h-28 object-cover rounded-lg opacity-90 rotate-3"
                />
              </div>
            )}
          </div>

          <UserStatsCard stats={stats} />
        </div>

        {/* Continue Listening Section */}
        <ContinueListening history={recentHistory} onPlay={onPlayPodcast} />

        {/* Recommended for You */}
        <RecommendedPodcasts
          episodes={recommendedEpisodes}
          level={recommendedLevel}
          onPlay={onPlayPodcast}
        />

        {/* Recent Episodes */}
        <RecentEpisodes
          episodes={recentPublishedEpisodes}
          onPlay={onPlayPodcast}
        />
      </div>
    </div>
  );
}
