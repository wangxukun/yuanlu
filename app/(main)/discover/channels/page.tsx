import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, SignalIcon } from "@heroicons/react/24/outline";
import { getRecommendedChannels } from "@/lib/discover-service";

export const metadata: Metadata = {
  title: "全部频道 | 远路播客",
  description: "发现远路播客上的所有播客频道与平台",
};

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const channels = await getRecommendedChannels();

  return (
    <div className="bg-ink-50 dark:bg-ink-950 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-6 xl:py-8 space-y-6 xl:space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/discover"
              className="p-2 hover:bg-ink-200 dark:hover:bg-ink-800 rounded-lg text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-100 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-lg">
              <SignalIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold text-ink-900 dark:text-ink-100">
                全部频道
              </h1>
              <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">
                探索各大优质播客平台与独立频道源
              </p>
            </div>
          </div>
        </div>

        {/* Grid List */}
        {channels.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {channels.map((channel) => (
              <Link
                href={`/channel/${encodeURIComponent(channel.name)}`}
                key={channel.name}
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
        ) : (
          <div className="bg-white dark:bg-ink-900 rounded-lg border border-ink-200 dark:border-ink-800 shadow-sm p-16 text-center text-ink-400 dark:text-ink-500 text-lg">
            暂无频道数据
          </div>
        )}
      </div>
    </div>
  );
}
