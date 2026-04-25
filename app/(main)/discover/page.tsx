// yuanlu/app/(main)/discover/page.tsx
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import {
  getTrendingPodcasts,
  getRecommendedChannels,
  getEditorPicks,
  getLatestPodcasts,
} from "@/lib/discover-service";
import HorizontalScrollContainer from "@/components/discover/HorizontalScrollContainer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "发现 | 远路播客",
  description: "探索、发现和订阅最酷的播客，量身定制适合你的水平和兴趣。",
};

export default async function DiscoverPage() {
  const [trendingPodcasts, recommendedChannels, editorPicks, newPodcasts] =
    await Promise.all([
      getTrendingPodcasts(),
      getRecommendedChannels(),
      getEditorPicks(),
      getLatestPodcasts(8),
    ]);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 pb-24">
      <div className="px-6 lg:px-8 py-10 max-w-7xl mx-auto">
        {/* Hot Programs Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-2xl font-bold text-slate-900 dark:text-slate-100"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              热门节目
            </h2>
            <Link
              href="/discover/trending"
              className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:underline"
            >
              查看更多
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trendingPodcasts.slice(0, 4).map((podcast, index) => {
              const rankColors = [
                "bg-[#FFD700] text-white", // 01 Gold
                "bg-[#C0C0C0] text-white", // 02 Silver
                "bg-[#CD7F32] text-white", // 03 Bronze
              ];
              return (
                <Link
                  href={`/podcast/${podcast.podcastid}`}
                  key={podcast.podcastid}
                >
                  <div className="rounded-[1rem] transition-shadow group cursor-pointer relative">
                    <div
                      className={`absolute top-2 left-2 z-10 ${rankColors[index]} w-8 h-8 rounded-full flex items-center justify-center font-black text-sm italic shadow-sm`}
                    >
                      0{index + 1}
                    </div>
                    <div className="aspect-square rounded-[1rem] overflow-hidden mb-4 relative">
                      <Image
                        src={podcast.coverUrl}
                        alt={podcast.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <p className="text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-1">
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
        </section>

        {/* 为你推荐 (For You) */}
        <HorizontalScrollContainer title="为你推荐">
          {editorPicks.map((podcast) => (
            <Link
              href={`/podcast/${podcast.podcastid}`}
              key={podcast.podcastid}
              className="flex-none w-64 group cursor-pointer"
            >
              <div className="relative aspect-square rounded-[1rem] overflow-hidden mb-4 bg-slate-100 dark:bg-slate-800 shadow-sm">
                <Image
                  src={podcast.coverUrl}
                  alt={podcast.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 shadow-xl">
                    <span
                      className="material-symbols-outlined text-indigo-600 text-3xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      play_arrow
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1 truncate">
                {podcast.platform || "精品推荐"}
              </p>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1 mb-1 group-hover:text-indigo-600 transition-colors">
                {podcast.title}
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-slate-400">
                  {podcast.episodeCount} 集
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full truncate max-w-full">
                  {podcast.category}
                </span>
              </div>
            </Link>
          ))}
        </HorizontalScrollContainer>

        {/* 新节目 (New Programs) */}
        <HorizontalScrollContainer title="新节目">
          {newPodcasts.map((podcast) => (
            <Link
              href={`/podcast/${podcast.podcastid}`}
              key={podcast.podcastid}
              className="flex-none w-64 group cursor-pointer"
            >
              <div className="relative aspect-square rounded-[1rem] overflow-hidden mb-4 bg-slate-100 dark:bg-slate-800 shadow-sm">
                <Image
                  src={podcast.coverUrl}
                  alt={podcast.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full shadow-lg">
                  New
                </div>
              </div>
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1 truncate">
                {podcast.platform || "新作推荐"}
              </p>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1 mb-1 group-hover:text-indigo-600 transition-colors">
                {podcast.title}
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-slate-400">
                  {podcast.episodeCount} 集
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full truncate max-w-full">
                  {podcast.category}
                </span>
              </div>
            </Link>
          ))}
        </HorizontalScrollContainer>

        {/* 推荐频道 (Recommended Channels) */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2
              className="text-2xl font-bold text-slate-900 dark:text-slate-100"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              推荐频道
            </h2>
            <Link
              href="/discover/channels"
              className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:underline"
            >
              查看全部
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendedChannels.slice(0, 4).map((channel) => (
              <Link
                href={`/channel/${encodeURIComponent(channel.name)}`}
                key={channel.name}
              >
                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-8 rounded-[24px] hover:scale-[1.02] transition-all duration-300 group flex flex-col items-center text-center border border-indigo-100 dark:border-indigo-800/30 h-full">
                  <h3
                    className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {channel.name}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8">
                    {channel.podcastCount} 档节目
                  </p>
                  <button className="mt-auto flex items-center justify-center gap-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-600/20 px-6 py-3 rounded-full font-bold text-sm hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white hover:shadow-md transition-all w-full">
                    <span className="material-symbols-outlined text-lg">
                      computer
                    </span>
                    <span>频道主页</span>
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
