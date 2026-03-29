import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, SignalIcon, TvIcon } from "@heroicons/react/24/outline";
import { getRecommendedChannels } from "@/lib/discover-service";

export const metadata: Metadata = {
  title: "全部频道 | 远路播客",
  description: "发现远路播客上的所有播客频道与平台",
};

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const channels = await getRecommendedChannels();

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
            <div className="bg-violet-100 dark:bg-violet-900/30 p-2 rounded-lg">
              <SignalIcon className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold text-base-content">
                全部频道
              </h1>
              <p className="text-sm text-base-content/60 mt-1">
                探索各大优质播客平台与独立频道源
              </p>
            </div>
          </div>
        </div>

        {/* Grid List */}
        {channels.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {channels.map((channel, idx) => {
              const palettes = [
                { bg: "bg-teal-800", text: "text-teal-800" },
                { bg: "bg-indigo-800", text: "text-indigo-800" },
                { bg: "bg-rose-800", text: "text-rose-800" },
                { bg: "bg-emerald-800", text: "text-emerald-800" },
                { bg: "bg-sky-800", text: "text-sky-800" },
                { bg: "bg-purple-800", text: "text-purple-800" },
              ];
              const palette = palettes[idx % palettes.length];

              return (
                <Link
                  href={`/channel/${encodeURIComponent(channel.name)}`}
                  key={channel.name}
                  className={`group relative overflow-hidden rounded-1xl xl:rounded-l ${palette.bg} text-white p-5 xl:p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex justify-center items-center w-full min-h-[160px] xl:min-h-[200px]`}
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
        ) : (
          <div className="bg-base-100 rounded-3xl border border-base-200 shadow-sm p-16 text-center text-base-content/40 text-lg">
            暂无频道数据
          </div>
        )}
      </div>
    </div>
  );
}
