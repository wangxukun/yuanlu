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
import { getTrendingPodcasts, getLatestPodcasts } from "@/lib/discover-service"; // [新增] 引入 getLatestPodcasts

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
  // ... (保持不变) ...
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

export const dynamic = "force-dynamic"; // 确保服务端每次渲染最新数据

export default async function DiscoverPage() {
  // 1. 并行获取热门数据和最新发布数据
  const [trendingPodcasts, latestPodcasts] = await Promise.all([
    getTrendingPodcasts(),
    getLatestPodcasts(1),
  ]);

  const featuredPodcast = latestPodcasts[0];

  return (
    <div className="bg-base-200 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Search Header (保持不变) */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          {/* ... */}
          <h1 className="text-3xl font-bold text-base-content">
            找到你的下一课
          </h1>
          <p className="text-base-content/60">
            探索、发现和订阅最酷的播客，量身定制适合你的水平和兴趣。
          </p>

          <div className="relative mt-4">
            <input
              type="text"
              placeholder="搜索“日常生活”或“新闻”......"
              className="w-full pl-12 pr-12 py-4 rounded-2xl border border-base-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base-content bg-base-100 placeholder:text-base-content/40"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40">
              <MagnifyingGlassIcon className="w-6 h-6" />
            </div>
            <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-base-content/40 hover:text-base-content hover:bg-base-200 rounded-lg transition-colors">
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Categories Grid */}
        <section>
          {/* ... */}
          <h2 className="text-xl font-bold text-base-content mb-6">
            按主题浏览
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((category) => (
              <Link
                href={`/series/${category.name.toLowerCase()}`}
                key={category.id}
                className="flex flex-col items-center justify-center p-6 bg-base-100 rounded-2xl border border-base-200 hover:border-primary/30 hover:shadow-md transition-all group"
              >
                <div
                  className={`p-3 rounded-full mb-3 ${category.colorClass} bg-opacity-20 group-hover:scale-110 transition-transform`}
                >
                  <CategoryIcon iconName={category.icon} className="w-6 h-6" />
                </div>
                <span className="font-medium text-base-content group-hover:text-primary transition-colors">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Banner (替换为真实数据) */}
        {featuredPodcast ? (
          <div className="relative rounded-3xl overflow-hidden bg-neutral text-neutral-content p-8 md:p-12 text-center md:text-left min-h-[400px] flex items-center">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent z-10"></div>
              {/* 使用 img 标签或者 next/image (如果配置了 remotePatterns) */}
              <img
                src={featuredPodcast.coverUrl}
                alt={featuredPodcast.title}
                className="w-full h-full object-cover opacity-50 blur-sm scale-105"
              />
            </div>

            <div className="relative z-20 max-w-2xl flex flex-col items-start gap-6">
              <span className="inline-block py-1.5 px-4 rounded-full bg-secondary text-primary-content text-sm font-bold uppercase tracking-wider shadow-lg shadow-primary/20">
                新系列
              </span>

              <h2 className="text-3xl md:text-5xl font-extrabold leading-tight">
                {featuredPodcast.title}
              </h2>

              <p className="text-neutral-content/80 text-lg leading-relaxed line-clamp-3">
                {featuredPodcast.description || "暂无描述"}
              </p>

              {featuredPodcast.tags && featuredPodcast.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {featuredPodcast.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="text-xs font-mono bg-white/10 px-2 py-1 rounded border border-white/10"
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-2">
                {featuredPodcast.firstEpisodeId ? (
                  <Link
                    href={`/episode/${featuredPodcast.firstEpisodeId}`}
                    className="btn btn-primary rounded-full px-8 h-12 text-base font-bold shadow-lg shadow-primary/30 border-none"
                  >
                    <PlayIcon className="mr-2 w-5 h-5" />
                    开始第一集
                  </Link>
                ) : (
                  <Link
                    href={`/podcast/${featuredPodcast.podcastid}`}
                    className="btn btn-primary rounded-full px-8 h-12 text-base font-bold shadow-lg shadow-primary/30 border-none"
                  >
                    <PlayIcon className="mr-2 w-5 h-5" />
                    查看详情
                  </Link>
                )}

                <Link
                  href={`/podcast/${featuredPodcast.podcastid}`}
                  className="btn btn-ghost bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full px-8 h-12 text-base font-semibold backdrop-blur-sm"
                >
                  查看全部 ({featuredPodcast.episodeCount || 0} 集)
                </Link>
              </div>
            </div>

            {/* Desktop Only: Right side visual */}
            <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 z-20">
              <div className="w-64 h-64 rounded-xl shadow-2xl rotate-6 border-4 border-white/10 overflow-hidden">
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
          <div className="skeleton w-full h-[400px] rounded-3xl"></div>
        )}

        {/* Trending & Charts */}
        <section>
          {/* ... */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <div className="bg-orange-100 dark:bg-orange-900/30 p-1.5 rounded-md">
                <ArrowTrendingUpIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-xl font-bold text-base-content">当前热门</h2>
            </div>
            <button className="text-sm font-medium text-primary hover:text-primary/80">
              Top 50
            </button>
          </div>

          <div className="bg-base-100 rounded-3xl border border-base-200 shadow-sm">
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
