"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import PodcastAuthPrompt from "@/components/main/home/podcast-auth-prompt";
import ResumeButton, { ResumeData } from "@/components/main/home/ResumeButton";
import UserStatsCard from "@/components/main/home/UserStatsCard";
import ContinueListening from "@/components/main/home/ContinueListening";
import RecommendedPodcasts from "@/components/main/home/RecommendedPodcasts";
import { UserHomeStatsDto } from "@/core/stats/dto";
import { RecentHistoryItemDto } from "@/core/listening-history/dto";
import { BoltIcon } from "@heroicons/react/24/solid";
import { User } from "next-auth";

interface HomeClientProps {
  user?: User;
  latestHistory: ResumeData | null;
  userStats: UserHomeStatsDto | null;
  recentHistory: RecentHistoryItemDto[]; // [新增]
}

export default function HomeClient({
  user,
  latestHistory,
  userStats,
  recentHistory,
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
    // 路由到播放页
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
    <div className="bg-base-200 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Welcome & Stats Hero */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg shadow-indigo-500/20">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <BoltIcon className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <h1 className="text-3xl font-bold mb-2">
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
              <ResumeButton latestHistory={latestHistory} />
            </div>
            {latestHistory && (
              <div className="absolute top-6 right-10 hidden sm:block">
                <Image
                  src={
                    latestHistory.coverUrl || "/static/images/podcast-light.png"
                  }
                  alt="Podcast"
                  width={516}
                  height={516}
                  className="w-48 h-28 object-cover rounded-lg shadow-md opacity-90 rotate-3 border-2 border-white/20"
                />
              </div>
            )}
          </div>
          <UserStatsCard stats={stats} />
        </div>

        {/* Continue Listening Section - 传入剩余的历史记录 */}
        <ContinueListening history={recentHistory} onPlay={onPlayPodcast} />

        {/* Recommended for You */}
        <RecommendedPodcasts onPlay={onPlayPodcast} />
      </div>
    </div>
  );
}
