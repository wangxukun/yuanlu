"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PodcastAuthPrompt from "@/components/main/home/podcast-auth-prompt";
import ResumeButton, { ResumeData } from "@/components/main/home/ResumeButton";
import WeeklyMileageCard from "@/components/main/home/WeeklyMileageCard";
import JourneyStrip, { JourneyDay } from "@/components/main/home/JourneyStrip";
import ContinueListening from "@/components/main/home/ContinueListening";
import RecommendedPodcasts from "@/components/main/home/RecommendedPodcasts";
import RecentEpisodes from "@/components/main/home/RecentEpisodes";
import { UserHomeStatsDto, WeeklyActivityItemDto } from "@/core/stats/dto";
import { RecentHistoryItemDto } from "@/core/listening-history/dto";
import { User } from "next-auth";
import { RecommendedEpisodeDto } from "@/core/episode/dto/recommended-episode.dto";

interface HomeClientProps {
  user?: User;
  userBio?: string;
  latestHistory: ResumeData | null;
  userStats: UserHomeStatsDto | null;
  weeklyActivity: WeeklyActivityItemDto[];
  recentHistory: RecentHistoryItemDto[];
  recommendedEpisodes: RecommendedEpisodeDto[];
  recommendedLevel: string;
  recentPublishedEpisodes: RecommendedEpisodeDto[];
}
export default function HomeClient({
  user,
  userBio,
  latestHistory,
  userStats,
  weeklyActivity,
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

  // 我的路：weeklyActivity 为周一~周日 7 天，标记今天
  const todayIndex = (new Date().getDay() + 6) % 7; // JS 周日=0 → 索引 6
  const journeyDays: JourneyDay[] =
    weeklyActivity.length === 7
      ? weeklyActivity.map((d, i) => ({
          label: d.day,
          minutes: d.minutes,
          isToday: i === todayIndex,
        }))
      : ["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map(
          (label, i) => ({ label, minutes: 0, isToday: i === todayIndex }),
        );

  // 继续收听卡的进度
  const resumeProgress =
    latestHistory && latestHistory.duration > 0
      ? Math.min(
          100,
          (latestHistory.progressSeconds / latestHistory.duration) * 100,
        )
      : 0;
  const resumeRemainingMins = latestHistory
    ? Math.max(
        0,
        Math.round(
          (latestHistory.duration - latestHistory.progressSeconds) / 60,
        ),
      )
    : 0;

  return (
    <div className="bg-ink-50 dark:bg-ink-950 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 space-y-10">
        {/* 问候行 */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1
              className="font-display text-2xl md:text-3xl font-bold text-ink-900 dark:text-ink-50"
              suppressHydrationWarning
            >
              {greeting}，{displayName}。
            </h1>
            <p className="mt-1 text-sm text-ink-400">
              {userBio || "路虽远行则将至，事虽难做则可成。"}
            </p>
          </div>
          {stats.streakDays > 0 && (
            <span className="shrink-0 inline-flex items-center gap-1 bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 rounded-full px-3 py-1.5 text-sm font-semibold">
              🔥 连续 {stats.streakDays} 天
            </span>
          )}
        </div>

        {/* 继续收听 + 本周里程 */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          <div className="flex-1 bg-white dark:bg-ink-900 rounded-2xl border border-ink-100 dark:border-ink-800 p-4 sm:p-6">
            {latestHistory ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
                <div className="relative w-full sm:w-40 md:w-48 aspect-[16/9] rounded-lg overflow-hidden shrink-0 bg-ink-100 dark:bg-ink-800">
                  <Image
                    src={
                      latestHistory.coverUrl ||
                      "/static/images/podcast-light.png"
                    }
                    alt={latestHistory.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <p className="text-xs text-ink-400 mb-1">继续收听</p>
                  <h2 className="font-semibold text-ink-900 dark:text-ink-50 line-clamp-1">
                    {latestHistory.title}
                  </h2>
                  <p className="text-sm text-ink-400 line-clamp-1 mt-0.5">
                    {latestHistory.author}
                  </p>
                  <div className="mt-3 w-full bg-ink-100 dark:bg-ink-800 rounded-full h-1">
                    <div
                      className="bg-primary-500 h-1 rounded-full"
                      style={{ width: `${resumeProgress}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-ink-400 whitespace-nowrap">
                      {latestHistory.isFinished
                        ? "已听完，值得再走一遍"
                        : `还剩约 ${resumeRemainingMins} 分钟`}
                    </span>
                    <div className="shrink-0">
                      <ResumeButton latestHistory={latestHistory} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-start justify-center gap-3">
                <p className="text-ink-500">
                  还没有收听记录，今天从一期新节目开始第一步吧。
                </p>
                <Link
                  href="/discover"
                  className="bg-primary-600 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-primary-700 transition-colors text-sm"
                >
                  去发现页看看
                </Link>
              </div>
            )}
          </div>

          <WeeklyMileageCard stats={stats} />
        </div>

        {/* 我的路 */}
        <section className="bg-white dark:bg-ink-900 rounded-2xl border border-ink-100 dark:border-ink-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-ink-900 dark:text-ink-50">
              我的路
            </h2>
            <Link
              href="/auth/personal-center"
              className="text-primary-600 dark:text-primary-400 text-sm font-semibold hover:underline"
            >
              查看学习报告 →
            </Link>
          </div>
          <JourneyStrip days={journeyDays} />
        </section>

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
