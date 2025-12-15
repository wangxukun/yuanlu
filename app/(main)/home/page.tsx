"use client";

import React from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import PodcastAuthPrompt from "@/components/main/home/podcast-auth-prompt";
import {
  PlayCircleIcon,
  // ClockIcon,
  BoltIcon,
  ArrowRightIcon,
  PlayIcon,
} from "@heroicons/react/24/solid";
import { ClockIcon as ClockOutlineIcon } from "@heroicons/react/24/outline";

// --- Mock Data ---

const MOCK_STATS = {
  streakDays: 12,
  dailyGoalMins: 30,
  remainingMins: 15,
  weeklyProgress: 12, // +12%
  listeningTimeCurrent: 4.5,
  listeningTimeGoal: 5,
  wordsLearnedCurrent: 42,
  wordsLearnedGoal: 50,
};

const MOCK_RECENT_PODCASTS = [
  {
    id: "1",
    title: "The Daily Life of a Programmer",
    author: "Tech Talk",
    progress: 75,
    thumbnailUrl: "/static/images/podcast-light.png",
  },
  {
    id: "2",
    title: "Learn English with Movies",
    author: "English 101",
    progress: 30,
    thumbnailUrl: "/static/images/podcast-dark.png",
  },
  {
    id: "3",
    title: "Global News Roundup",
    author: "World News",
    progress: 90,
    thumbnailUrl: "/static/images/episode-light.png",
  },
];

const MOCK_RECOMMENDED_PODCASTS = [
  {
    id: "101",
    title: "Modern History",
    author: "History Buffs",
    category: "History",
    duration: "45 min",
    thumbnailUrl: "/static/images/episode-dark.png",
  },
  {
    id: "102",
    title: "Culinary Secrets",
    author: "Chef Gordon",
    category: "Food",
    duration: "32 min",
    thumbnailUrl: "/static/images/podcast-light.png",
  },
  {
    id: "103",
    title: "Space Exploration",
    author: "NASA Fan",
    category: "Science",
    duration: "58 min",
    thumbnailUrl: "/static/images/podcast-dark.png",
  },
  {
    id: "104",
    title: "Mindfulness 101",
    author: "Peaceful Mind",
    category: "Health",
    duration: "20 min",
    thumbnailUrl: "/static/images/episode-light.png",
  },
];

export default function Home() {
  const { data: session, status } = useSession();

  console.log(session);
  // 1. 未登录状态：显示引导页
  if (status === "unauthenticated") {
    return <PodcastAuthPrompt />;
  }

  // 2. 登录状态但 Session 未加载完成：显示 Loading 或空
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  // 3. 已登录状态：显示主页内容
  // const user = session?.user || {
  //   name: "User",
  //   nickname: "User",
  //   avatarUrl: "",
  // };
  // const displayName = user.nickname || user.name || user.email?.split("@")[0] || "Friend";

  // const currentHour = new Date().getHours();
  // const greeting =
  //     currentHour < 12
  //         ? "Good morning"
  //         : currentHour < 18
  //             ? "Good afternoon"
  //             : "Good evening";

  const onPlayPodcast = (id: string) => {
    console.log("Play podcast:", id);
    // 这里可以集成播放器逻辑，例如 usePlayerStore.getState().play(id)
  };

  return (
    <div className="bg-base-100 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Welcome & Stats Hero */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Welcome Section */}
          <div className="flex-1 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg shadow-indigo-500/20">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <BoltIcon className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <h1 className="text-3xl font-bold mb-2">
                {/*{greeting}, {displayName}!*/} 被我注释了！！！！
              </h1>
              <p className="text-indigo-100 mb-6 max-w-md text-sm sm:text-base leading-relaxed">
                You're on a <strong>{MOCK_STATS.streakDays} day streak</strong>.
                Keep it up!
                <br />
                Your daily goal is {MOCK_STATS.dailyGoalMins} mins, you have{" "}
                {MOCK_STATS.remainingMins} mins left.
              </p>
              <button className="bg-white text-indigo-600 px-6 py-2.5 rounded-full font-semibold hover:bg-indigo-50 transition-colors inline-flex items-center shadow-md border-none">
                <PlayCircleIcon className="w-5 h-5 mr-2" />
                Resume Learning
              </button>
            </div>
          </div>

          {/* Mini Stats Card */}
          <div className="md:w-80 bg-base-100 rounded-3xl p-6 shadow-sm border border-base-200 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base-content">
                Weekly Progress
              </h3>
              <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full dark:bg-green-900/30 dark:text-green-400">
                +{MOCK_STATS.weeklyProgress}%
              </span>
            </div>
            <div className="space-y-4">
              {/* Listening Time */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-base-content/60">Listening Time</span>
                  <span className="font-medium text-base-content">
                    {MOCK_STATS.listeningTimeCurrent} /{" "}
                    {MOCK_STATS.listeningTimeGoal}h
                  </span>
                </div>
                <div className="w-full bg-base-200 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full"
                    style={{
                      width: `${(MOCK_STATS.listeningTimeCurrent / MOCK_STATS.listeningTimeGoal) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
              {/* Words Learned */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-base-content/60">Words Learned</span>
                  <span className="font-medium text-base-content">
                    {MOCK_STATS.wordsLearnedCurrent} /{" "}
                    {MOCK_STATS.wordsLearnedGoal}
                  </span>
                </div>
                <div className="w-full bg-base-200 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{
                      width: `${(MOCK_STATS.wordsLearnedCurrent / MOCK_STATS.wordsLearnedGoal) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Listening Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-base-content">
              Continue Listening
            </h2>
            <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              View History
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOCK_RECENT_PODCASTS.map((podcast) => (
              <div
                key={podcast.id}
                className="bg-base-100 p-4 rounded-xl shadow-sm border border-base-200 hover:shadow-md transition-shadow cursor-pointer flex items-center space-x-4 group"
                onClick={() => onPlayPodcast(podcast.id)}
              >
                <div className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-base-300">
                  <Image
                    src={podcast.thumbnailUrl}
                    alt={podcast.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircleIcon className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-base-content line-clamp-2 mb-1">
                    {podcast.title}
                  </h3>
                  <p className="text-xs text-base-content/60 mb-2">
                    {podcast.author}
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-1 bg-base-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${podcast.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-base-content/40 font-medium">
                      {podcast.progress}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recommended for You */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-base-content">
                Recommended for You
              </h2>
              <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
                Intermediate
              </span>
            </div>
            <button className="p-1 rounded-full hover:bg-base-200 transition-colors">
              <ArrowRightIcon className="w-5 h-5 text-base-content/40" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {MOCK_RECOMMENDED_PODCASTS.map((podcast) => (
              <div key={podcast.id} className="group flex flex-col">
                <div className="relative aspect-square mb-3 overflow-hidden rounded-xl bg-base-200">
                  <Image
                    src={podcast.thumbnailUrl}
                    alt={podcast.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md flex items-center">
                    <ClockOutlineIcon className="w-3 h-3 mr-1" />
                    {podcast.duration}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <button
                      onClick={() => onPlayPodcast(podcast.id)}
                      className="bg-white/90 text-indigo-600 rounded-full p-3 shadow-lg hover:scale-110 transition-transform border-none"
                    >
                      <PlayIcon className="w-8 h-8 fill-indigo-600 text-indigo-600 ml-0.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                    {podcast.category}
                  </span>
                  <h3 className="font-bold text-base-content leading-tight group-hover:text-primary transition-colors line-clamp-1">
                    {podcast.title}
                  </h3>
                  <p className="text-sm text-base-content/60">
                    {podcast.author}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
