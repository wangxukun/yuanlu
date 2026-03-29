import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { PlayIcon } from "@heroicons/react/24/solid";
import { ClockIcon as ClockOutlineIcon } from "@heroicons/react/24/outline";
import { Headphones } from "lucide-react";
import { episodeService } from "@/core/episode/episode.service";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "更多推荐 | 远路",
  description: "发现更多为你量身定制的播客单集",
};

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const session = await auth();
  const userId = session?.user?.userid;

  const data = await episodeService
    .getRecommendedEpisodes(userId, 12)
    .catch(() => ({
      level: "General",
      items: [],
    }));

  const episodes = data.items;
  const level = data.level;

  return (
    <div className="bg-base-200 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-6 xl:py-8 space-y-6 xl:space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/home"
              className="p-2 hover:bg-base-300 rounded-lg text-base-content/60 hover:text-base-content transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg">
              <span className="w-6 h-6 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-base">
                ✨
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl xl:text-3xl font-bold text-base-content">
                  为你推荐
                </h1>
                {level && (
                  <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
                    {level === "General" ? "精选" : level}
                  </span>
                )}
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                根据你的学习阶段与历史记录量身定制的单集
              </p>
            </div>
          </div>
        </div>

        {/* Grid List */}
        {episodes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 xl:gap-6 pt-4">
            {episodes.map((episode) => {
              const diffLevel = episode.difficulty || level || "General";
              let diffColor = "text-gray-700";
              if (diffLevel.includes("A")) diffColor = "text-emerald-600";
              else if (diffLevel.includes("B1")) diffColor = "text-blue-600";
              else if (diffLevel.includes("B2")) diffColor = "text-purple-600";
              else if (diffLevel.includes("C")) diffColor = "text-rose-600";

              return (
                <div
                  key={episode.id}
                  className="card bg-base-100 shadow-sm hover:shadow-lg border border-base-200 hover:border-primary/20 transition-all duration-300 group overflow-hidden relative cursor-pointer"
                >
                  {/* Cover image */}
                  <figure className="relative aspect-[16/9] overflow-hidden">
                    <Image
                      src={
                        episode.coverUrl ||
                        "/static/images/default_cover_url.png"
                      }
                      alt={episode.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* PRO and Play count badges (top left) */}
                    <div className="absolute top-2 left-2 z-10 flex gap-1.5 items-center">
                      {episode.isExclusive && (
                        <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-1.5 py-0.5 rounded shadow-sm font-extrabold text-[10px] tracking-widest flex items-center">
                          👑 PRO
                        </div>
                      )}
                      {episode.playCount !== undefined && (
                        <div className="bg-[rgba(20,20,30,0.8)] text-white backdrop-blur-md px-1.5 py-0.5 rounded shadow-sm text-[11px] font-medium flex items-center tracking-wide">
                          <Headphones className="w-3 h-3 mr-1 opacity-80" />
                          {episode.playCount.toLocaleString()}
                        </div>
                      )}
                    </div>
                    {/* Difficulty badge (top right) */}
                    <div className="absolute top-2 right-2 z-10">
                      <div
                        className={`bg-white/95 px-2 py-0.5 rounded shadow-sm font-extrabold text-sm tracking-wide ${diffColor}`}
                      >
                        {diffLevel}
                      </div>
                    </div>
                    {/* Category badge (bottom left) */}
                    {episode.category && (
                      <div className="absolute bottom-2 left-2 z-10">
                        <div className="bg-rose-100/95 text-rose-700 px-2 py-0.5 rounded shadow-sm font-bold text-xs flex items-center">
                          <PlayIcon className="w-3 h-3 mr-1" />
                          {episode.category}
                        </div>
                      </div>
                    )}
                    {/* Duration badge (bottom right) */}
                    <div className="absolute bottom-2 right-2 z-10">
                      <div className="bg-black/70 text-white backdrop-blur-sm px-2 py-0.5 rounded shadow-sm text-xs font-medium flex items-center">
                        <ClockOutlineIcon className="w-3 h-3 mr-1" />
                        {episode.duration}
                      </div>
                    </div>
                    {/* Play overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-primary text-primary-content flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 shadow-xl">
                        <PlayIcon className="w-6 h-6 ml-1" />
                      </div>
                    </div>
                  </figure>
                  {/* Card body */}
                  <div className="card-body p-4 xl:p-5 pointer-events-none">
                    <h3 className="text-base xl:text-lg font-bold text-base-content line-clamp-1 group-hover:text-primary transition-colors">
                      {episode.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-base-content/50 truncate w-full mt-1">
                      <span className="truncate max-w-[320px] sm:max-w-[320px]">
                        {episode.podcastTitle}
                      </span>
                    </div>
                  </div>

                  {/* Base link moved to bottom to ensure it covers the image and body */}
                  <Link
                    href={`/episode/${episode.id}`}
                    className="absolute inset-0 z-20"
                    aria-label={episode.title}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-base-100 rounded-3xl border border-base-200 shadow-sm p-16 text-center text-base-content/40 text-lg">
            暂无推荐内容，请先去收听一些节目吧！
          </div>
        )}
      </div>
    </div>
  );
}
