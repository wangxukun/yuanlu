// yuanlu/app/(main)/discover/page.tsx
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import {
  ArrowTrendingUpIcon,
  FaceFrownIcon,
  SignalIcon,
  TvIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { PlayIcon } from "@heroicons/react/24/solid";
import {
  getTrendingPodcasts,
  getPodcastsByQuery,
  getRecommendedChannels,
} from "@/lib/discover-service";
import DiscoverSearch from "./DiscoverSearch";
import { Headphones, Layers } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ query?: string }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = params.query;

  return {
    title: query ? `搜索结果: ${query} | 远路播客` : "发现 | 远路播客",
    description: "探索、发现和订阅最酷的播客，量身定制适合你的水平和兴趣。",
  };
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const params: { query?: string } = await searchParams;
  const query: string = params.query ?? "";
  const isSearching = !!query;

  // 获取数据
  const searchResults = isSearching ? await getPodcastsByQuery(query) : [];

  // 并行获取基础数据
  const [trendingPodcasts, recommendedChannels] = await Promise.all([
    !isSearching ? getTrendingPodcasts() : Promise.resolve([]),
    !isSearching ? getRecommendedChannels() : Promise.resolve([]),
  ]);

  return (
    <div className="bg-base-200 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-6 xl:py-8 space-y-8 xl:space-y-12">
        {/* Search Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 xl:space-y-4">
          <h1 className="text-2xl xl:text-3xl font-bold text-base-content">
            {isSearching ? `搜索结果: "${query}"` : "找到你的下一课"}
          </h1>
          <p className="text-sm xl:text-base text-base-content/60 px-4">
            {isSearching
              ? `共找到 ${searchResults.length} 个相关播客`
              : "探索、发现和订阅最酷的播客，量身定制适合你的水平和兴趣。"}
          </p>
          <DiscoverSearch />
        </div>

        {/* --- 搜索结果或默认视图 --- */}
        {isSearching ? (
          <section className="space-y-6">
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {searchResults.map((podcast) => (
                  <Link
                    href={`/podcast/${podcast.podcastid}`}
                    key={podcast.podcastid}
                    className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow border border-base-200"
                  >
                    <figure className="relative aspect-square overflow-hidden rounded-t-2xl">
                      <img
                        src={podcast.coverUrl}
                        alt={podcast.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                      {podcast.tags && podcast.tags.length > 0 && (
                        <div className="absolute bottom-2 left-2">
                          <div className="badge badge-neutral badge-sm bg-black/50 border-none text-white backdrop-blur-sm">
                            {podcast.tags[0].name}
                          </div>
                        </div>
                      )}
                    </figure>
                    <div className="card-body p-4 xl:p-5">
                      <h3 className="card-title text-base xl:text-lg font-bold line-clamp-1">
                        {podcast.title}
                      </h3>
                      <p className="text-sm text-base-content/60 line-clamp-2 min-h-[2.5em]">
                        {podcast.description || "暂无描述"}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-base-content/40">
                          {podcast.episodeCount} 集
                        </div>
                        <button className="btn btn-circle btn-sm btn-primary btn-outline">
                          <PlayIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-base-content/40">
                <FaceFrownIcon className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">没有找到相关播客</p>
                <p className="text-sm">
                  尝试更换关键词，或者浏览推荐频道发现更多内容
                </p>
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Recommended Channels */}
            {recommendedChannels.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4 xl:mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="bg-violet-100 dark:bg-violet-900/30 p-1.5 rounded-md">
                      <SignalIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <h2 className="text-lg xl:text-xl font-bold text-base-content">
                      推荐频道
                    </h2>
                  </div>
                  <Link
                    href="/discover/channels"
                    className="flex items-center gap-1 text-sm font-medium text-base-content/60 hover:text-primary transition-colors"
                  >
                    更多
                    <ChevronRightIcon className="w-4 h-4 gap-0" />
                  </Link>
                </div>
                <div className="flex sm:grid gap-4 xl:gap-5 overflow-x-auto sm:overflow-visible pb-4 sm:pb-0 snap-x sm:snap-none scrollbar-hide sm:grid-cols-2 lg:grid-cols-3">
                  {recommendedChannels.slice(0, 3).map((channel, idx) => {
                    const palettes = [
                      { bg: "bg-teal-800", text: "text-teal-800" },
                      { bg: "bg-indigo-800", text: "text-indigo-800" },
                      { bg: "bg-rose-800", text: "text-rose-800" },
                      { bg: "bg-emerald-800", text: "text-emerald-800" },
                      { bg: "bg-sky-800", text: "text-sky-800" },
                      { bg: "bg-purple-800", text: "text-purple-800" },
                    ];
                    const palette = palettes[idx % palettes.length];

                    // Use first two letters as initials
                    return (
                      <Link
                        href={`/channel/${encodeURIComponent(channel.name)}`}
                        key={channel.name}
                        className={`group relative overflow-hidden rounded-1xl xl:rounded-l ${palette.bg} text-white p-5 xl:p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex justify-center items-center flex-shrink-0 w-[280px] snap-center sm:w-full sm:flex-shrink sm:snap-none min-h-[160px] xl:min-h-[200px]`}
                      >
                        <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center">
                          <h3 className="text-[20px] xl:text-[24px] font-bold uppercase tracking-wide truncate mb-2 w-full">
                            {channel.name}
                          </h3>
                          <p className="text-sm xl:text-base text-white/80 truncate mb-4 w-full">
                            {`${channel.name} · 频道 · ${channel.podcastCount} 档节目`}
                          </p>
                          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/20 text-white/90 text-[13px] font-medium hover:bg-black/30 transition-colors">
                            <TvIcon className="w-4 h-4" />
                            频道主页
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Trending Podcasts (Card Style) */}
            <section>
              <div className="flex items-center justify-between mb-4 xl:mb-6">
                <div className="flex items-center space-x-2">
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-1.5 rounded-md">
                    <ArrowTrendingUpIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h2 className="text-lg xl:text-xl font-bold text-base-content">
                    热门播客
                  </h2>
                </div>
                <Link
                  href="/discover/trending"
                  className="flex items-center gap-1 text-sm font-medium text-base-content/60 hover:text-primary transition-colors"
                >
                  更多
                  <ChevronRightIcon className="w-4 h-4 gap-0" />
                </Link>
              </div>
              {trendingPodcasts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 xl:gap-5">
                  {trendingPodcasts.slice(0, 4).map((podcast, index) => (
                    <Link
                      href={`/podcast/${podcast.podcastid}`}
                      key={podcast.podcastid}
                      className="card bg-base-100 shadow-sm hover:shadow-lg border border-base-200 hover:border-primary/20 transition-all duration-300 group overflow-hidden"
                    >
                      {/* Cover image */}
                      <figure className="relative aspect-square overflow-hidden">
                        <Image
                          src={podcast.coverUrl}
                          alt={podcast.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Rank badge */}
                        <div className="absolute top-2 left-2">
                          <div
                            className={`w-7 h-7 xl:w-8 xl:h-8 rounded-lg flex items-center justify-center text-xs xl:text-sm font-extrabold shadow-lg ${
                              index === 0
                                ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                                : index === 1
                                  ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800"
                                  : index === 2
                                    ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white"
                                    : "bg-black/50 text-white backdrop-blur-sm"
                            }`}
                          >
                            {index + 1}
                          </div>
                        </div>
                        {/* Category badge */}
                        {podcast.category && (
                          <div className="absolute bottom-2 left-2">
                            <div className="badge badge-sm bg-black/50 border-none text-white backdrop-blur-sm">
                              {podcast.category}
                            </div>
                          </div>
                        )}
                        {/* Play overlay on hover */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-primary text-primary-content flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 shadow-xl">
                            <PlayIcon className="w-5 h-5 ml-0.5" />
                          </div>
                        </div>
                      </figure>
                      {/* Card body */}
                      <div className="card-body p-3 xl:p-4">
                        <h3 className="text-sm xl:text-base font-bold text-base-content line-clamp-1 group-hover:text-primary transition-colors">
                          {podcast.title}
                        </h3>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-2 text-xs text-base-content/50 truncate">
                            {podcast.platform && (
                              <span className="truncate max-w-[320px] sm:max-w-[320px]">
                                {podcast.platform}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-3 text-xs text-base-content/40">
                            <span className="flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {podcast.episodeCount} 集
                            </span>
                            <span className="flex items-center gap-1">
                              <Headphones className="w-3 h-3" />
                              {podcast.totalPlays.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-base-100 rounded-2xl xl:rounded-3xl border border-base-200 shadow-sm p-8 text-center text-base-content/40">
                  暂无热门播客数据
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
