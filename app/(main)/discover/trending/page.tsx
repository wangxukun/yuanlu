// yuanlu/app/(main)/discover/trending/page.tsx
import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import { PlayIcon } from "@heroicons/react/24/solid";
import { Headphones, Layers } from "lucide-react";
import { getTrendingPodcasts } from "@/lib/discover-service";

export const metadata: Metadata = {
  title: "热门播客 | 远路播客",
  description: "发现远路播客上最受欢迎、播放量最高的优质播客内容",
};

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  const trendingPodcasts = await getTrendingPodcasts(50); // Get top 50

  return (
    <div className="bg-base-200 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-6 xl:py-8 space-y-6 xl:space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/discover"
              className="p-2 hover:bg-base-300 rounded-lg text-base-content/60 hover:text-base-content transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
              <ArrowTrendingUpIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold text-base-content">
                热门播客
              </h1>
              <p className="text-sm text-base-content/60 mt-1">
                大家都在收听的精选节目
              </p>
            </div>
          </div>
        </div>

        {/* Grid List */}
        {trendingPodcasts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 xl:gap-6 pt-4">
            {trendingPodcasts.map((podcast, index) => (
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
                      className={`w-8 h-8 xl:w-10 xl:h-10 rounded-xl flex items-center justify-center text-sm xl:text-base font-extrabold shadow-lg ${
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
                      <div className="badge badge-sm bg-black/50 border-none text-white backdrop-blur-sm px-3 py-3">
                        {podcast.category}
                      </div>
                    </div>
                  )}
                  {/* Play overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-primary text-primary-content flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 shadow-xl">
                      <PlayIcon className="w-6 h-6 ml-1" />
                    </div>
                  </div>
                </figure>
                {/* Card body */}
                <div className="card-body p-4 xl:p-5">
                  <h3 className="text-base xl:text-lg font-bold text-base-content line-clamp-1 group-hover:text-primary transition-colors">
                    {podcast.title}
                  </h3>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2 text-sm text-base-content/50 truncate">
                      {podcast.platform && (
                        <span className="truncate max-w-[150px]">
                          {podcast.platform}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4 text-xs font-medium text-base-content/40">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4" />
                        {podcast.episodeCount} 集
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Headphones className="w-4 h-4" />
                        {podcast.totalPlays.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-base-100 rounded-3xl border border-base-200 shadow-sm p-16 text-center text-base-content/40 text-lg">
            暂无热门播客数据
          </div>
        )}
      </div>
    </div>
  );
}
