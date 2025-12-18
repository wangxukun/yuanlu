import React from "react";
import Image from "next/image";
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
import TrendingRow from "@/components/main/discover/TrendingRow"; // 引入新组件
import { getTrendingPodcasts } from "@/lib/discover-service"; // 引入后端查询

// --- Types ---
interface Category {
  id: string;
  name: string;
  icon: string;
  colorClass: string;
}

// --- Mock Data (Categories 保持静态即可，也可后续改为从数据库获取) ---
const CATEGORIES: Category[] = [
  {
    id: "1",
    name: "Business",
    icon: "Briefcase",
    colorClass:
      "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    id: "2",
    name: "Daily Life",
    icon: "Coffee",
    colorClass:
      "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400",
  },
  {
    id: "3",
    name: "News",
    icon: "Newspaper",
    colorClass: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  },
  {
    id: "4",
    name: "Tech",
    icon: "Cpu",
    colorClass:
      "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400",
  },
  {
    id: "5",
    name: "Travel",
    icon: "Plane",
    colorClass:
      "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    id: "6",
    name: "Culture",
    icon: "Book",
    colorClass:
      "text-pink-600 bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400",
  },
];

// --- Helper Components ---
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

export default async function DiscoverPage() {
  // 1. 获取真实热门数据
  const trendingPodcasts = await getTrendingPodcasts();

  return (
    <div className="bg-base-200 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Search Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h1 className="text-3xl font-bold text-base-content">
            找到你的下一课
          </h1>
          <p className="text-base-content/60">
            探索、发现和订阅最酷的播客，量身定制适合你的水平和兴趣。
          </p>

          <div className="relative mt-4">
            <input
              type="text"
              placeholder="搜索“商务英语”或“旅行”......"
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
          <h2 className="text-xl font-bold text-base-content mb-6">
            按主题浏览
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((category) => (
              <Link
                href={`/series/${category.name.toLowerCase()}`} // 假设有分类页面
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

        {/* Trending & Charts */}
        <section>
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

        {/* Featured Banner (保持静态，或后续替换为最新推荐) */}
        <div className="relative rounded-3xl overflow-hidden bg-gray-900 text-white p-8 md:p-12 text-center md:text-left">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent z-10"></div>
            <Image
              src="/static/images/podcast-dark.png"
              alt="Background"
              fill
              className="object-cover opacity-50"
            />
          </div>
          <div className="relative z-20 max-w-lg">
            <span className="inline-block py-1 px-3 rounded-full bg-primary text-primary-content text-xs font-bold uppercase tracking-wider mb-4">
              新系列
            </span>
            <h2 className="text-3xl font-bold mb-4">
              English for Global Travel
            </h2>
            <p className="text-gray-300 mb-8 leading-relaxed">
              Master the essential vocabulary and cultural nuances you need for
              your next international adventure. From booking flights to making
              local friends.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <button className="bg-white text-gray-900 px-6 py-3 rounded-full font-bold hover:bg-gray-100 transition-colors flex items-center justify-center shadow-lg border-none">
                <PlayIcon className="mr-2 w-5 h-5" />
                开始第一集
              </button>
              <button className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-full font-semibold hover:bg-white/20 transition-colors border border-white/20">
                查看全部
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
