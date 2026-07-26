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
    <div className="bg-ink-50 dark:bg-ink-950 min-h-screen text-ink-900 dark:text-ink-100 pb-24">
      <div className="px-6 lg:px-8 py-10 max-w-7xl mx-auto">
        {/* Hot Programs Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100">
              热门节目
            </h2>
            <Link
              href="/discover/trending"
              className="text-primary-600 dark:text-primary-400 text-sm font-semibold hover:underline"
            >
              查看更多
            </Link>
          </div>
          <div className="flex lg:grid lg:grid-cols-4 gap-6 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 -mx-6 px-6 lg:mx-0 lg:px-0 scrollbar-none">
            {trendingPodcasts.slice(0, 4).map((podcast, index) => {
              const rankColors = [
                "bg-[#FFD700] text-white", // 01 Gold
                "bg-[#C0C0C0] text-white", // 02 Silver
                "bg-[#CD7F32] text-white", // 03 Bronze
                "bg-[#666666] text-white", // 04 iron
              ];
              return (
                <Link
                  href={`/podcast/${podcast.podcastid}`}
                  key={podcast.podcastid}
                  className="flex-none w-64 lg:w-auto lg:flex-initial"
                >
                  <div className="rounded-lg transition-shadow group cursor-pointer relative">
                    <div
                      className={`absolute top-2 left-2 z-10 ${rankColors[index]} w-8 h-8 rounded-full flex items-center justify-center font-black text-sm italic shadow-sm`}
                    >
                      0{index + 1}
                    </div>
                    <div className="aspect-square rounded-lg overflow-hidden mb-4 relative">
                      <Image
                        src={podcast.coverUrl}
                        alt={podcast.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <p className="text-primary-600 dark:text-primary-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                      {podcast.platform || "热门趋势"}
                    </p>
                    <h3 className="text-base font-bold text-ink-900 dark:text-ink-100 mb-2 truncate group-hover:text-primary-600 transition-colors">
                      {podcast.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] text-ink-500 font-semibold">
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
        <HorizontalScrollContainer title="为您推荐">
          {editorPicks.map((podcast) => (
            <Link
              href={`/podcast/${podcast.podcastid}`}
              key={podcast.podcastid}
              className="flex-none w-64 group cursor-pointer"
            >
              <div className="relative aspect-square rounded-lg overflow-hidden mb-4 bg-ink-100 dark:bg-ink-800 shadow-sm">
                <Image
                  src={podcast.coverUrl}
                  alt={podcast.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <p className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-1 truncate">
                {podcast.platform || "精品推荐"}
              </p>
              <h3 className="font-bold text-ink-900 dark:text-ink-100 line-clamp-1 mb-1 group-hover:text-primary-600 transition-colors">
                {podcast.title}
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-ink-400">
                  {podcast.episodeCount} 集
                </span>
                <span className="w-1 h-1 rounded-full bg-ink-300 dark:bg-ink-600"></span>
                <span className="text-xs text-primary-600 dark:text-primary-400 font-medium px-2 py-0.5 bg-ink-100 dark:bg-ink-800 rounded-full truncate max-w-full">
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
              <div className="relative aspect-square rounded-lg overflow-hidden mb-4 bg-ink-100 dark:bg-ink-800 shadow-sm">
                <Image
                  src={podcast.coverUrl}
                  alt={podcast.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 px-3 py-1 bg-primary-600 text-white text-[10px] font-bold rounded-full shadow-lg">
                  New
                </div>
              </div>
              <p className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-1 truncate">
                {podcast.platform || "新作推荐"}
              </p>
              <h3 className="font-bold text-ink-900 dark:text-ink-100 line-clamp-1 mb-1 group-hover:text-primary-600 transition-colors">
                {podcast.title}
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-ink-400">
                  {podcast.episodeCount} 集
                </span>
                <span className="w-1 h-1 rounded-full bg-ink-300 dark:bg-ink-600"></span>
                <span className="text-xs text-primary-600 dark:text-primary-400 font-medium px-2 py-0.5 bg-ink-100 dark:bg-ink-800 rounded-full truncate max-w-full">
                  {podcast.category}
                </span>
              </div>
            </Link>
          ))}
        </HorizontalScrollContainer>

        {/* 推荐频道 (Recommended Channels) */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-100">
              推荐频道
            </h2>
            <Link
              href="/discover/channels"
              className="text-primary-600 dark:text-primary-400 text-sm font-semibold hover:underline"
            >
              查看更多
            </Link>
          </div>
          <div className="flex lg:grid lg:grid-cols-4 gap-6 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 -mx-6 px-6 lg:mx-0 lg:px-0 scrollbar-none">
            {recommendedChannels.slice(0, 4).map((channel) => (
              <Link
                href={`/channel/${encodeURIComponent(channel.name)}`}
                key={channel.name}
                className="flex-none w-72 lg:w-auto lg:flex-initial"
              >
                <div className="bg-primary-50 dark:bg-primary-900/10 p-8 rounded-lg hover:scale-[1.02] transition-all duration-300 group flex flex-col items-center text-center h-full">
                  <h3 className="text-xl font-bold text-ink-900 dark:text-ink-100 mb-2">
                    {channel.name}
                  </h3>
                  <p className="text-ink-500 dark:text-ink-400 text-sm font-medium mb-8">
                    {channel.podcastCount} 档节目
                  </p>
                  <div className="mt-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white dark:bg-ink-800/50 text-primary-600 dark:text-primary-400 text-[12px] font-bold group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">
                      computer
                    </span>
                    <span>频道主页</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
