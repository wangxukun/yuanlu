import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import { PlayIcon } from "@heroicons/react/24/solid";
import { Headphones, Layers } from "lucide-react";
import { getChannelData } from "@/core/channel/channel.service";

type Props = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `热门节目 - ${decodedName} | 远路播客`,
    description: `查看 ${decodedName} 频道下最受欢迎的播客节目`,
  };
}

export default async function ChannelTrendingPage({ params }: Props) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const channelData = await getChannelData(decodedName);

  if (!channelData) {
    notFound();
  }

  const { topShows, platformName } = channelData;

  return (
    <div className="bg-base-200 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-6 xl:py-8 space-y-6 xl:space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/channel/${encodeURIComponent(platformName)}`}
              className="p-2 hover:bg-base-300 rounded-lg text-base-content/60 hover:text-base-content transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div className="bg-primary/10 p-2 rounded-lg">
              <ArrowTrendingUpIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold text-base-content">
                {platformName} · 热门节目
              </h1>
              <p className="text-sm text-base-content/60 mt-1">
                本频道下最受欢迎的精选节目
              </p>
            </div>
          </div>
        </div>

        {/* Grid List */}
        {topShows.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 xl:gap-6 pt-4">
            {topShows.map((show, index) => (
              <Link
                href={`/podcast/${show.podcastid}`}
                key={show.podcastid}
                className="card bg-base-100 shadow-sm hover:shadow-lg border border-base-200 hover:border-primary/20 transition-all duration-300 group overflow-hidden"
              >
                {/* Cover image */}
                <figure className="relative aspect-square overflow-hidden">
                  <Image
                    src={show.coverUrl}
                    alt={show.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Rank badge */}
                  <div className="absolute top-2 left-2">
                    <div
                      className={`w-8 h-8 xl:w-10 xl:h-10 rounded-xl flex items-center justify-center text-sm xl:text-base font-extrabold shadow-lg ${
                        index === 0
                          ? "bg-gradient-to-br from-accent-400 to-accent-500 text-white"
                          : index === 1
                            ? "bg-gradient-to-br from-ink-300 to-ink-400 text-ink-800"
                            : index === 2
                              ? "bg-gradient-to-br from-accent-600 to-accent-700 text-white"
                              : "bg-black/50 text-white backdrop-blur-sm"
                      }`}
                    >
                      {index + 1}
                    </div>
                  </div>
                  {/* Category badge */}
                  {show.tags?.[0] && (
                    <div className="absolute bottom-2 left-2">
                      <div className="badge badge-sm bg-black/50 border-none text-white backdrop-blur-sm px-3 py-3">
                        {show.tags[0].name}
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
                    {show.title}
                  </h3>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2 text-sm text-base-content/50 truncate">
                      <span className="truncate max-w-[150px]">
                        {platformName}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4 text-xs font-medium text-base-content/40">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4" />
                        {show.episodeCount} 集
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Headphones className="w-4 h-4" />
                        {show.totalPlays?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-base-100 rounded-3xl border border-base-200 shadow-sm p-16 text-center text-base-content/40 text-lg">
            该频道下暂无热门节目数据
          </div>
        )}
      </div>
    </div>
  );
}
