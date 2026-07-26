import React from "react";

export default function HomeLoading() {
  return (
    <div className="bg-ink-50 dark:bg-ink-950 min-h-screen text-ink-900 dark:text-ink-100 pb-24">
      <div className="px-6 lg:px-8 py-10 max-w-7xl mx-auto space-y-12">
        {/* Welcome Section / Resume Banner Skeleton */}
        <section className="bg-white dark:bg-ink-900 rounded-3xl p-6 lg:p-8 border border-ink-100 dark:border-ink-800 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Cover and Play Icon Skeleton */}
            <div className="relative flex-shrink-0 w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-ink-200 dark:bg-ink-800 animate-shimmer overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                <div className="w-12 h-12 rounded-full bg-ink-300 dark:bg-ink-700 animate-shimmer" />
              </div>
            </div>
            {/* Title / Description Text Skeleton */}
            <div className="flex-1 space-y-4 w-full text-center md:text-left">
              <div className="h-4 w-24 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer mx-auto md:mx-0" />
              <div className="h-7 w-3/4 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer mx-auto md:mx-0" />
              <div className="h-4 w-1/2 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer mx-auto md:mx-0" />
              {/* Progress and Button Skeleton */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 justify-center md:justify-start">
                <div className="h-10 w-32 rounded-xl bg-ink-200 dark:bg-ink-800 animate-shimmer" />
                <div className="h-4 w-28 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
              </div>
            </div>
          </div>
        </section>

        {/* Stats Grid Section Skeleton */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-2xl p-6 flex items-center gap-4 shadow-sm"
            >
              {/* Left Round Icon Area */}
              <div className="w-12 h-12 rounded-2xl bg-ink-200 dark:bg-ink-800 animate-shimmer flex-shrink-0" />
              {/* Right Text Stats */}
              <div className="space-y-2 flex-1">
                <div className="h-3 w-16 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
                <div className="h-6 w-24 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
              </div>
            </div>
          ))}
        </section>

        {/* Continue Listening & Recommended Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Continue Listening List Skeleton (Left 2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div className="h-6 w-28 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm"
                >
                  {/* Thumbnail Cover */}
                  <div className="w-16 h-16 rounded-xl bg-ink-200 dark:bg-ink-800 animate-shimmer flex-shrink-0" />
                  {/* Text Details */}
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
                    <div className="h-3 w-1/4 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
                    {/* Linear Progress Bar */}
                    <div className="h-1.5 w-full rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden mt-2">
                      <div className="h-full w-1/3 rounded-full bg-ink-200 dark:bg-ink-700 animate-shimmer" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Episodes Section Skeleton (Right 1 column) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="h-6 w-24 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-2xl p-4 flex gap-4 shadow-sm"
                >
                  <div className="w-16 h-16 rounded-xl bg-ink-200 dark:bg-ink-800 animate-shimmer flex-shrink-0" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="h-4 w-3/4 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
                    <div className="h-3 w-1/2 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Published Section Skeleton */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-6 w-28 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <div className="aspect-square rounded-2xl bg-ink-200 dark:bg-ink-800 animate-shimmer w-full" />
                <div className="h-4 w-3/4 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
                <div className="h-3 w-1/2 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
