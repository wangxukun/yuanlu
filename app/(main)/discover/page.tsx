// yuanlu/app/(main)/discover/page.tsx
import React from "react";
import Link from "next/link";
import {
  ArrowTrendingUpIcon,
  BriefcaseIcon,
  NewspaperIcon,
  CpuChipIcon,
  GlobeAmericasIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  HashtagIcon,
  FaceFrownIcon,
} from "@heroicons/react/24/outline";
import { PlayIcon } from "@heroicons/react/24/solid";
import TrendingRow from "@/components/main/discover/TrendingRow";
import {
  getTrendingPodcasts,
  getLatestPodcasts,
  getPopularTags,
  getPodcastsByQuery,
} from "@/lib/discover-service";
import DiscoverSearch from "./DiscoverSearch";

// --- Style Utils ---
const STYLE_PALETTES = [
  {
    colorClass:
      "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
    icon: "Briefcase",
  },
  {
    colorClass:
      "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400",
    icon: "Coffee",
  },
  {
    colorClass: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400",
    icon: "Newspaper",
  },
  {
    colorClass:
      "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400",
    icon: "Cpu",
  },
  {
    colorClass:
      "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
    icon: "Plane",
  },
  {
    colorClass:
      "text-pink-600 bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400",
    icon: "Book",
  },
];

// 图标映射
const getCategoryIcon = (
  iconName: string,
  props: React.ComponentProps<"svg">,
) => {
  switch (iconName) {
    case "Briefcase":
      return <BriefcaseIcon {...props} />;
    case "Coffee":
      return <ChatBubbleLeftRightIcon {...props} />;
    case "Newspaper":
      return <NewspaperIcon {...props} />;
    case "Cpu":
      return <CpuChipIcon {...props} />;
    case "Plane":
      return <GlobeAmericasIcon {...props} />;
    case "Book":
      return <BookOpenIcon {...props} />;
    default:
      return <HashtagIcon {...props} />;
  }
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ query?: string }>;
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  // [修复] 显式定义 params 类型，并处理 query 的 undefined 情况
  const params: { query?: string } = await searchParams;
  const query: string = params.query ?? ""; // 确保是 string，如果是 undefined 则为空字符串
  const isSearching = !!query;

  // 获取数据
  const searchResults = isSearching ? await getPodcastsByQuery(query) : [];

  // 并行获取基础数据
  const [trendingPodcasts, latestPodcasts, popularTags] = await Promise.all([
    !isSearching ? getTrendingPodcasts() : Promise.resolve([]),
    !isSearching ? getLatestPodcasts(1) : Promise.resolve([]),
    getPopularTags(6),
  ]);

  const featuredPodcast = latestPodcasts[0];

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

        {/* Categories Grid (始终显示) */}
        <section>
          {!isSearching && (
            <h2 className="text-lg xl:text-xl font-bold text-base-content mb-4 xl:mb-6">
              热门主题
            </h2>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 xl:gap-4">
            {popularTags.map((tag, index) => {
              const style = STYLE_PALETTES[index % STYLE_PALETTES.length];
              return (
                <Link
                  href={`/series/${tag.name}`}
                  key={tag.id}
                  className="flex flex-col items-center justify-center p-4 xl:p-6 bg-base-100 rounded-xl xl:rounded-2xl border border-base-200 hover:border-primary/30 hover:shadow-md transition-all group"
                >
                  <div
                    className={`p-2 xl:p-3 rounded-full mb-2 xl:mb-3 ${style.colorClass} bg-opacity-20 group-hover:scale-110 transition-transform`}
                  >
                    {getCategoryIcon(style.icon, {
                      className: "w-5 h-5 xl:w-6 xl:h-6",
                    })}
                  </div>
                  <span className="font-medium text-sm xl:text-base text-base-content group-hover:text-primary transition-colors">
                    {tag.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

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
                  尝试更换关键词，或者浏览上方的热门主题
                </p>
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Featured Banner */}
            {featuredPodcast && (
              <div className="relative rounded-2xl xl:rounded-3xl overflow-hidden bg-neutral text-neutral-content p-6 xl:p-12 text-left min-h-[320px] xl:min-h-[400px] flex items-center">
                <div className="absolute inset-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent z-10"></div>
                  <img
                    src={featuredPodcast.coverUrl}
                    alt={featuredPodcast.title}
                    className="w-full h-full object-cover opacity-50 blur-sm scale-105"
                  />
                </div>
                <div className="relative z-20 max-w-2xl flex flex-col items-start gap-4 xl:gap-6 w-full">
                  <span className="inline-block py-1 px-3 xl:py-1.5 xl:px-4 rounded-full bg-secondary text-primary-content text-xs xl:text-sm font-bold uppercase tracking-wider shadow-lg shadow-primary/20">
                    新系列
                  </span>
                  <h2 className="text-2xl sm:text-4xl xl:text-5xl font-extrabold leading-tight line-clamp-2">
                    {featuredPodcast.title}
                  </h2>
                  <p className="text-neutral-content/80 text-sm xl:text-lg leading-relaxed line-clamp-3 max-w-full xl:max-w-[90%]">
                    {featuredPodcast.description || "暂无描述"}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 xl:gap-4 w-full sm:w-auto mt-2 xl:mt-2">
                    <Link
                      href={`/podcast/${featuredPodcast.podcastid}`}
                      className="btn btn-primary rounded-full px-8 h-10 xl:h-12 text-sm xl:text-base font-bold shadow-lg shadow-primary/30 border-none w-full sm:w-auto"
                    >
                      <PlayIcon className="mr-2 w-4 h-4 xl:w-5 xl:h-5" />{" "}
                      查看详情
                    </Link>
                  </div>
                </div>
                <div className="hidden xl:block absolute right-12 top-1/2 -translate-y-1/2 z-20">
                  <div className="w-64 h-64 rounded-xl shadow-2xl rotate-6 border-4 border-white/10 overflow-hidden">
                    <img
                      src={featuredPodcast.coverUrl}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Trending Section */}
            <section>
              <div className="flex items-center justify-between mb-4 xl:mb-6">
                <div className="flex items-center space-x-2">
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-1.5 rounded-md">
                    <ArrowTrendingUpIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h2 className="text-lg xl:text-xl font-bold text-base-content">
                    当前热门
                  </h2>
                </div>
              </div>
              <div className="bg-base-100 rounded-2xl xl:rounded-3xl border border-base-200 shadow-sm">
                {trendingPodcasts.length > 0 ? (
                  trendingPodcasts.map((podcast, index) => (
                    <TrendingRow
                      key={podcast.podcastid}
                      podcast={podcast}
                      rank={index + 1}
                    />
                  ))
                ) : (
                  <div className="p-8 text-center text-base-content/40">
                    暂无热门播客数据
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
