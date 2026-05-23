import React from "react";

export default function PodcastDetailLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-24 relative w-full overflow-x-hidden">
      {/* Immersive blurred background placeholder */}
      <div className="absolute top-0 left-0 w-full h-[380px] overflow-hidden -z-10 pointer-events-none">
        <div className="w-full h-full bg-indigo-50/40 dark:bg-indigo-950/10 blur-[80px] saturate-150 scale-110 animate-shimmer" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/80 dark:via-slate-950/80 to-slate-50 dark:to-slate-950"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10 space-y-8">
        {/* Header Section Skeleton */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] p-6 lg:p-8 border border-slate-100 dark:border-slate-800/50 shadow-sm flex flex-col md:flex-row gap-8 items-start md:items-center">
          {/* Large Square Cover Skeleton */}
          <div className="w-40 h-40 md:w-44 md:h-44 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-shimmer flex-shrink-0 mx-auto md:mx-0 shadow-md" />

          {/* Podcast Info Text Skeleton */}
          <div className="flex-1 space-y-4 w-full text-center md:text-left">
            {/* Platform indicator */}
            <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-800 animate-shimmer mx-auto md:mx-0" />
            {/* Title */}
            <div className="h-7 w-3/4 rounded bg-slate-200 dark:bg-slate-800 animate-shimmer mx-auto md:mx-0" />

            {/* Tags Pills Row */}
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <div className="h-6 w-16 rounded-full bg-slate-200 dark:bg-slate-800 animate-shimmer" />
              <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-800 animate-shimmer" />
            </div>

            {/* Counts indicators Row */}
            <div className="flex items-center gap-4 justify-center md:justify-start text-xs pt-1">
              <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800 animate-shimmer" />
              <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-800 animate-shimmer" />
            </div>

            {/* Follow/Subscribe Button Skeleton */}
            <div className="pt-2 flex justify-center md:justify-start">
              <div className="h-10 w-28 rounded-full bg-slate-200 dark:bg-slate-800 animate-shimmer" />
            </div>
          </div>
        </div>

        {/* Description Card Skeleton */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] p-6 lg:p-8 border border-slate-100 dark:border-slate-800/50 shadow-sm space-y-3">
          <div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-800 animate-shimmer" />
          <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800 animate-shimmer" />
          <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-800 animate-shimmer" />
          <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800 animate-shimmer" />
        </div>

        {/* Episode List Section Skeleton */}
        <div className="space-y-6">
          {/* Section Header */}
          <div className="flex items-center justify-between px-2">
            <div className="h-6 w-28 rounded bg-slate-200 dark:bg-slate-800 animate-shimmer" />
            <div className="h-5 w-16 rounded bg-slate-200 dark:bg-slate-800 animate-shimmer" />
          </div>

          {/* 4 Mock Episode Rows */}
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-slate-100 dark:border-slate-800/40 shadow-sm flex gap-4 md:gap-6 items-center"
              >
                {/* Round Play Button Placeholder */}
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 animate-shimmer flex-shrink-0 flex items-center justify-center">
                  <div className="w-4 h-4 bg-slate-300 dark:bg-slate-700 rounded" />
                </div>

                {/* Small Episode Cover Placeholder */}
                <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-800 animate-shimmer flex-shrink-0" />

                {/* Text Details Section */}
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-5 w-1/2 rounded bg-slate-200 dark:bg-slate-800 animate-shimmer" />
                  <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-800 animate-shimmer hidden md:block" />
                  {/* Meta elements */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-800 animate-shimmer" />
                    <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-12 rounded bg-slate-200 dark:bg-slate-800 animate-shimmer" />
                  </div>
                </div>

                {/* Download Button Placeholder */}
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-shimmer flex-shrink-0 flex items-center justify-center" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
