// yuanlu/app/(main)/discover/page.tsx
import React from "react";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  AdjustmentsHorizontalIcon,
  BriefcaseIcon,
  NewspaperIcon,
  CpuChipIcon,
  GlobeAmericasIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  MusicalNoteIcon,
} from "@heroicons/react/24/outline";
import { PlayIcon } from "@heroicons/react/24/solid";
import TrendingRow from "@/components/main/discover/TrendingRow";
import { getTrendingPodcasts, getLatestPodcasts } from "@/lib/discover-service";

// --- Types & Mock Data ---
interface Category {
  id: string;
  name: string;
  icon: string;
  colorClass: string;
}

const CATEGORIES: Category[] = [
  {
    id: "1",
    name: "商业",
    icon: "Briefcase",
    colorClass:
      "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    id: "2",
    name: "日常生活",
    icon: "Coffee",
    colorClass:
      "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400",
  },
  {
    id: "3",
    name: "新闻",
    icon: "Newspaper",
    colorClass: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  },
  {
    id: "4",
    name: "技术",
    icon: "Cpu",
    colorClass:
      "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400",
  },
  {
    id: "5",
    name: "交通",
    icon: "Plane",
    colorClass:
      "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    id: "6",
    name: "文化",
    icon: "Book",
    colorClass:
      "text-pink-600 bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400",
  },
];

const CategoryIcon = ({
  iconName,
  className,
}: {
  iconName: string;
  className?: string;
}) => {
  const props = { className: className || "w-6 h-6" };
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
      return <MusicalNoteIcon {...props} />;
  }
};

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const [trendingPodcasts, latestPodcasts] = await Promise.all([
    getTrendingPodcasts(),
    getLatestPodcasts(1),
  ]);

  const featuredPodcast = latestPodcasts[0];

  return (
    <div className="bg-base-200 min-h-screen pb-20">
      {/* [布局调整]:
         Mobile/Tablet: px-4 py-6 space-y-8
         Desktop (xl): max-w-7xl px-8 py-8 space-y-12 (保持原样)
      */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-6 xl:py-8 space-y-8 xl:space-y-12">
        {/* Search Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 xl:space-y-4">
          <h1 className="text-2xl xl:text-3xl font-bold text-base-content">
            找到你的下一课
          </h1>
          <p className="text-sm xl:text-base text-base-content/60 px-4">
            探索、发现和订阅最酷的播客，量身定制适合你的水平和兴趣。
          </p>

          <div className="relative mt-4">
            {/* Mobile: py-3 text-sm / Desktop: py-4 text-base */}
            <input
              type="text"
              placeholder="搜索“日常生活”或“新闻”......"
              className="w-full pl-10 xl:pl-12 pr-10 xl:pr-12 py-3 xl:py-4 rounded-xl xl:rounded-2xl border border-base-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base-content bg-base-100 placeholder:text-base-content/40 text-sm xl:text-base"
            />
            <div className="absolute left-3 xl:left-4 top-1/2 -translate-y-1/2 text-base-content/40">
              <MagnifyingGlassIcon className="w-5 h-5 xl:w-6 xl:h-6" />
            </div>
            <button className="absolute right-2 xl:right-3 top-1/2 -translate-y-1/2 p-2 text-base-content/40 hover:text-base-content hover:bg-base-200 rounded-lg transition-colors">
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Categories Grid */}
        <section>
          <h2 className="text-lg xl:text-xl font-bold text-base-content mb-4 xl:mb-6">
            按主题浏览
          </h2>
          {/* [关键布局点]:
             Mobile: grid-cols-2 (2列)
             Tablet (md): grid-cols-3 (3列)
             Large Tablet (lg): grid-cols-4 (4列 - 优化平板显示)
             Desktop (xl): grid-cols-6 (6列 - 严格还原)
          */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 xl:gap-4">
            {CATEGORIES.map((category) => (
              <Link
                href={`/series/${category.name.toLowerCase()}`}
                key={category.id}
                // Mobile: p-4 rounded-xl / Desktop: p-6 rounded-2xl
                className="flex flex-col items-center justify-center p-4 xl:p-6 bg-base-100 rounded-xl xl:rounded-2xl border border-base-200 hover:border-primary/30 hover:shadow-md transition-all group"
              >
                <div
                  className={`p-2 xl:p-3 rounded-full mb-2 xl:mb-3 ${category.colorClass} bg-opacity-20 group-hover:scale-110 transition-transform`}
                >
                  <CategoryIcon
                    iconName={category.icon}
                    className="w-5 h-5 xl:w-6 xl:h-6"
                  />
                </div>
                <span className="font-medium text-sm xl:text-base text-base-content group-hover:text-primary transition-colors">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Banner */}
        {featuredPodcast ? (
          <div className="relative rounded-2xl xl:rounded-3xl overflow-hidden bg-neutral text-neutral-content p-6 xl:p-12 text-left min-h-[320px] xl:min-h-[400px] flex items-center">
            {/* Background Image */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent z-10"></div>
              { }
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

              {/* Mobile: text-2xl / Tablet: text-4xl / Desktop (xl): text-5xl */}
              <h2 className="text-2xl sm:text-4xl xl:text-5xl font-extrabold leading-tight line-clamp-2">
                {featuredPodcast.title}
              </h2>

              <p className="text-neutral-content/80 text-sm xl:text-lg leading-relaxed line-clamp-3 max-w-full xl:max-w-[90%]">
                {featuredPodcast.description || "暂无描述"}
              </p>

              {/* Tags: Mobile hidden or smaller gap */}
              {featuredPodcast.tags && featuredPodcast.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 xl:gap-2">
                  {featuredPodcast.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="text-[10px] xl:text-xs font-mono bg-white/10 px-1.5 py-0.5 xl:px-2 xl:py-1 rounded border border-white/10"
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Buttons: Mobile full width stack / Desktop row */}
              <div className="flex flex-col sm:flex-row gap-3 xl:gap-4 w-full sm:w-auto mt-2 xl:mt-2">
                {featuredPodcast.firstEpisodeId ? (
                  <Link
                    href={`/episode/${featuredPodcast.firstEpisodeId}`}
                    className="btn btn-primary rounded-full px-8 h-10 xl:h-12 text-sm xl:text-base font-bold shadow-lg shadow-primary/30 border-none w-full sm:w-auto"
                  >
                    <PlayIcon className="mr-2 w-4 h-4 xl:w-5 xl:h-5" />
                    开始第一集
                  </Link>
                ) : (
                  <Link
                    href={`/podcast/${featuredPodcast.podcastid}`}
                    className="btn btn-primary rounded-full px-8 h-10 xl:h-12 text-sm xl:text-base font-bold shadow-lg shadow-primary/30 border-none w-full sm:w-auto"
                  >
                    <PlayIcon className="mr-2 w-4 h-4 xl:w-5 xl:h-5" />
                    查看详情
                  </Link>
                )}

                <Link
                  href={`/podcast/${featuredPodcast.podcastid}`}
                  className="btn btn-ghost bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full px-8 h-10 xl:h-12 text-sm xl:text-base font-semibold backdrop-blur-sm w-full sm:w-auto"
                >
                  查看全部 ({featuredPodcast.episodeCount || 0} 集)
                </Link>
              </div>
            </div>

            {/* Desktop Only Image: 严格使用 xl:block, 其他 hidden */}
            <div className="hidden xl:block absolute right-12 top-1/2 -translate-y-1/2 z-20">
              <div className="w-64 h-64 rounded-xl shadow-2xl rotate-6 border-4 border-white/10 overflow-hidden">
                { }
                <img
                  src={featuredPodcast.coverUrl}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        ) : (
          // Fallback UI
          <div className="skeleton w-full h-[300px] xl:h-[400px] rounded-3xl"></div>
        )}

        {/* Trending & Charts */}
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
            <button className="text-sm font-medium text-primary hover:text-primary/80">
              Top 50
            </button>
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
      </div>
    </div>
  );
}
