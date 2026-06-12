// yuanlu/app/(main)/discover/trending/page.tsx
import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import { getTrendingPodcasts } from "@/lib/discover-service";

export const metadata: Metadata = {
  title: "热门播客 | 远路播客",
  description: "发现远路播客上最受欢迎、播放量最高的优质播客内容",
};

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  const trendingPodcasts = await getTrendingPodcasts(50); // Get top 50

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-6 xl:py-8 space-y-6 xl:space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/discover"
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
              <ArrowTrendingUpIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1
                className="text-2xl xl:text-3xl font-bold text-slate-900 dark:text-slate-100"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                热门播客
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                大家都在收听的精选节目
              </p>
            </div>
          </div>
        </div>

        {/* Grid List */}
        {trendingPodcasts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-4">
            {trendingPodcasts.map((podcast, index) => {
              const rankColors = [
                "bg-[#FFD700] text-white", // 01 Gold
                "bg-[#C0C0C0] text-white", // 02 Silver
                "bg-[#CD7F32] text-white", // 03 Bronze
                "bg-[#666666] text-white", // 04 iron
              ];
              const rankBg =
                rankColors[index] ||
                "bg-slate-400 dark:bg-slate-600 text-white";
              const rankText =
                index + 1 < 10 ? `0${index + 1}` : `${index + 1}`;

              return (
                <Link
                  href={`/podcast/${podcast.podcastid}`}
                  key={podcast.podcastid}
                  className="group cursor-pointer"
                >
                  <div className="rounded-lg transition-shadow relative">
                    <div
                      className={`absolute top-2 left-2 z-10 ${rankBg} w-8 h-8 rounded-full flex items-center justify-center font-black text-sm italic shadow-sm`}
                    >
                      {rankText}
                    </div>
                    <div className="aspect-square rounded-lg overflow-hidden mb-4 relative bg-slate-100 dark:bg-slate-800">
                      <Image
                        src={podcast.coverUrl}
                        alt={podcast.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <p className="text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-1 truncate">
                      {podcast.platform || "热门趋势"}
                    </p>
                    <h3
                      className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2 truncate group-hover:text-indigo-600 transition-colors"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {podcast.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">
                          headphones
                        </span>
                        {(podcast.totalPlays / 1000).toFixed(1)}k 收听者
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-16 text-center text-slate-400 dark:text-slate-500 text-lg">
            暂无热门播客数据
          </div>
        )}
      </div>
    </div>
  );
}
