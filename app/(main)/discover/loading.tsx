import React from "react";

export default function DiscoverLoading() {
  return (
    <div className="bg-ink-50 dark:bg-ink-950 min-h-screen text-ink-900 dark:text-ink-100 pb-24">
      <div className="px-6 lg:px-8 py-10 max-w-7xl mx-auto">
        {/* Hot Programs Section Skeleton */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            {/* Title Skeleton */}
            <div className="h-8 w-32 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
            {/* Link Skeleton */}
            <div className="h-4 w-16 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex-none w-full relative">
                {/* Rank Number Skeleton */}
                <div className="absolute top-2 left-2 z-10 w-8 h-8 rounded-full bg-ink-300 dark:bg-ink-700 animate-shimmer" />
                {/* Image Cover Skeleton */}
                <div className="aspect-square rounded-lg bg-ink-200 dark:bg-ink-800 animate-shimmer mb-4 w-full" />
                {/* Platform Label Skeleton */}
                <div className="h-3 w-16 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer mb-2" />
                {/* Title Skeleton */}
                <div className="h-5 w-3/4 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer mb-2" />
                {/* Subtitle/Metadata Skeleton */}
                <div className="h-3 w-1/2 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
              </div>
            ))}
          </div>
        </section>

        {/* For You Section Skeleton */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 w-32 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
          </div>
          {/* Horizontal scroll mock cards */}
          <div className="flex gap-6 overflow-x-hidden pb-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex-none w-64">
                <div className="aspect-square rounded-lg bg-ink-200 dark:bg-ink-800 animate-shimmer mb-4 w-full" />
                <div className="h-3 w-20 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer mb-2" />
                <div className="h-4 w-3/4 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer mb-2" />
                <div className="flex items-center gap-2">
                  <div className="h-3 w-12 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
                  <span className="w-1 h-1 rounded-full bg-ink-300 dark:bg-ink-600"></span>
                  <div className="h-4 w-16 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* New Programs Section Skeleton */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 w-24 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
          </div>
          <div className="flex gap-6 overflow-x-hidden pb-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex-none w-64">
                <div className="aspect-square rounded-lg bg-ink-200 dark:bg-ink-800 animate-shimmer mb-4 w-full relative">
                  {/* "New" Badge Skeleton */}
                  <div className="absolute top-4 right-4 px-3 py-2 bg-ink-300 dark:bg-ink-700 rounded-full w-10 h-4 animate-shimmer" />
                </div>
                <div className="h-3 w-20 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer mb-2" />
                <div className="h-4 w-3/4 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer mb-2" />
                <div className="flex items-center gap-2">
                  <div className="h-3 w-12 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
                  <span className="w-1 h-1 rounded-full bg-ink-300 dark:bg-ink-600"></span>
                  <div className="h-4 w-16 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recommended Channels Section Skeleton */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div className="h-8 w-32 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
            <div className="h-4 w-16 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="bg-primary-50/50 dark:bg-primary-900/5 p-8 rounded-lg flex flex-col items-center text-center h-52 animate-shimmer"
              >
                <div className="h-6 w-24 rounded bg-ink-200 dark:bg-ink-800 mb-2 animate-shimmer" />
                <div className="h-4 w-16 rounded bg-ink-200 dark:bg-ink-800 mb-8 animate-shimmer" />
                <div className="mt-auto h-8 w-28 rounded-full bg-ink-200 dark:bg-ink-800 animate-shimmer" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
