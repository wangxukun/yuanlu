// app/(main)/search/SearchResultsContent.tsx
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { searchPodcasts } from "@/core/podcast/podcast-search.service";

interface SearchResultsContentProps {
  query: string;
}

export default async function SearchResultsContent({
  query,
}: SearchResultsContentProps) {
  if (!query.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
          podcast_search
        </span>
        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
          输入关键词开始搜索
        </p>
        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
          支持按播客标题、标签和描述搜索
        </p>
      </div>
    );
  }

  const results = await searchPodcasts({ query, limit: 40 });

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
          search_off
        </span>
        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
          没有找到与 &ldquo;{query}&rdquo; 相关的播客
        </p>
        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
          试试换个关键词，或浏览{" "}
          <Link
            href="/discover"
            className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            发现页面
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        共找到{" "}
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {results.length}
        </span>{" "}
        个相关播客
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {results.map((podcast) => (
          <Link href={`/podcast/${podcast.podcastid}`} key={podcast.podcastid}>
            <div className="rounded-[1rem] transition-all group cursor-pointer hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/20 hover:-translate-y-1 duration-300">
              {/* Cover */}
              <div className="aspect-square rounded-[1rem] overflow-hidden mb-4 relative bg-slate-200 dark:bg-slate-800">
                <Image
                  src={podcast.coverUrl}
                  alt={podcast.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 shadow-xl">
                    <span
                      className="material-symbols-outlined text-indigo-600 text-3xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      play_arrow
                    </span>
                  </div>
                </div>
              </div>

              {/* Platform tag */}
              <p className="text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-1 truncate">
                {podcast.platform || "播客"}
              </p>

              {/* Title */}
              <h3
                className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {podcast.title}
              </h3>

              {/* Description */}
              {podcast.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                  {podcast.description}
                </p>
              )}

              {/* Meta row */}
              <div className="flex items-center gap-2 flex-wrap">
                {podcast.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag.id}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full font-medium"
                  >
                    {tag.name}
                  </span>
                ))}
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">
                    headphones
                  </span>
                  {podcast.episodeCount} 集
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
