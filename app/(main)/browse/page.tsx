"use client";

import React from "react";
import Image from "next/image";
import {
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  AdjustmentsHorizontalIcon,
  PlayCircleIcon,
  EllipsisHorizontalIcon,
  ClockIcon,
  BriefcaseIcon,
  NewspaperIcon,
  CpuChipIcon,
  GlobeAmericasIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  MusicalNoteIcon,
} from "@heroicons/react/24/outline";
import { PlayIcon } from "@heroicons/react/24/solid";

// --- Types ---
interface Category {
  id: string;
  name: string;
  icon: string;
  colorClass: string; // 存储颜色类名组合
}

interface Podcast {
  id: string;
  title: string;
  author: string;
  category: string;
  thumbnailUrl: string;
  duration: string;
  plays: number;
}

// --- Mock Data ---
const MOCK_CATEGORIES: Category[] = [
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

const MOCK_TRENDING_PODCASTS: Podcast[] = [
  {
    id: "1",
    title: "The Art of Small Talk",
    author: "English 101",
    category: "Daily Life",
    thumbnailUrl: "/static/images/podcast-light.png",
    duration: "12 min",
    plays: 12500,
  },
  {
    id: "2",
    title: "Silicon Valley News",
    author: "Tech Weekly",
    category: "Tech",
    thumbnailUrl: "/static/images/podcast-dark.png",
    duration: "24 min",
    plays: 10200,
  },
  {
    id: "3",
    title: "Business Etiquette 101",
    author: "Career Coach",
    category: "Business",
    thumbnailUrl: "/static/images/episode-light.png",
    duration: "18 min",
    plays: 9800,
  },
  {
    id: "4",
    title: "Hidden Gems of Paris",
    author: "Travel Guide",
    category: "Travel",
    thumbnailUrl: "/static/images/episode-dark.png",
    duration: "35 min",
    plays: 8400,
  },
  {
    id: "5",
    title: "Understanding AI",
    author: "Future Tech",
    category: "Tech",
    thumbnailUrl: "/static/images/podcast-logo-light.png",
    duration: "42 min",
    plays: 7600,
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

export default function BrowsePage() {
  const onPlayPodcast = (id: string) => {
    console.log("Playing podcast", id);
  };

  return (
    <div className="bg-base-200 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Search Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h1 className="text-3xl font-bold text-base-content">
            Find your next lesson
          </h1>
          <p className="text-base-content/60">
            Explore thousands of episodes tailored to your level and interests.
          </p>

          <div className="relative mt-4">
            <input
              type="text"
              placeholder="Search for 'Business English' or 'Travel'..."
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
            Browse by Topic
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {MOCK_CATEGORIES.map((category) => (
              <button
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
              </button>
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
              <h2 className="text-xl font-bold text-base-content">
                Trending Now
              </h2>
            </div>
            <button className="text-sm font-medium text-primary hover:text-primary/80">
              See Top 50
            </button>
          </div>

          <div className="bg-base-100 rounded-3xl border border-base-200 shadow-sm overflow-hidden">
            {MOCK_TRENDING_PODCASTS.map((podcast, index) => (
              <div
                key={podcast.id}
                className="flex items-center p-4 hover:bg-base-200/50 transition-colors border-b border-base-200 last:border-0 group cursor-pointer"
                onClick={() => onPlayPodcast(podcast.id)}
              >
                {/* Rank */}
                <div className="w-8 text-center font-bold text-base-content/40 group-hover:text-primary">
                  {index + 1}
                </div>

                {/* Thumbnail */}
                <div className="relative mx-4 flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-base-300">
                  <Image
                    src={podcast.thumbnailUrl}
                    alt={podcast.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircleIcon className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="text-sm font-bold text-base-content truncate">
                    {podcast.title}
                  </h3>
                  <div className="flex items-center space-x-2 text-xs text-base-content/60">
                    <span>{podcast.author}</span>
                    <span>•</span>
                    <span>{podcast.category}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center space-x-6 mr-6">
                  <div className="flex items-center text-xs text-base-content/60">
                    <ClockIcon className="w-3.5 h-3.5 mr-1" />
                    {podcast.duration}
                  </div>
                  <div className="flex items-center text-xs text-base-content/60">
                    <MusicalNoteIcon className="w-3.5 h-3.5 mr-1" />
                    {podcast.plays.toLocaleString()}
                  </div>
                </div>

                {/* Action */}
                <button className="p-2 text-base-content/40 hover:text-base-content hover:bg-base-200 rounded-full transition-colors">
                  <EllipsisHorizontalIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-gray-900 text-white p-8 md:p-12 text-center md:text-left">
          <div className="absolute inset-0">
            {/* 使用 CSS 渐变模拟图片背景，或替换为真实的 Image 组件 */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent z-10"></div>
            <Image
              src="/static/images/podcast-dark.png" // 使用本地图片作为背景示例
              alt="Background"
              fill
              className="object-cover opacity-50"
            />
          </div>
          <div className="relative z-20 max-w-lg">
            <span className="inline-block py-1 px-3 rounded-full bg-primary text-primary-content text-xs font-bold uppercase tracking-wider mb-4">
              New Series
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
                Start Episode 1
              </button>
              <button className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-full font-semibold hover:bg-white/20 transition-colors border border-white/20">
                View Syllabus
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
