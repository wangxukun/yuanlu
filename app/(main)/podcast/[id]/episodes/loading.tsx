import React from "react";

export default function EpisodesLoading() {
  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-900 font-sans pb-24 relative w-full overflow-x-hidden transition-colors duration-300">
      {/* Immersive blurred background placeholder */}
      <div className="absolute top-0 left-0 w-full h-[500px] overflow-hidden -z-10 pointer-events-none">
        <div className="w-full h-full bg-primary-50/40 dark:bg-primary-950/10 blur-[80px] saturate-150 scale-110 animate-shimmer" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink-50/80 to-ink-50 dark:via-ink-900/80 dark:to-ink-900"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-12 relative z-10 space-y-6">
        {/* Header with Back button Skeleton */}
        <div className="flex items-center gap-3 mb-6">
          {/* Back button pill */}
          <div className="flex items-center gap-2 text-ink-400 shrink-0 w-20">
            <div className="p-1.5 rounded-full bg-ink-200 dark:bg-ink-800 w-8 h-8 animate-shimmer" />
            <div className="h-4 w-8 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
          </div>

          {/* Podcast Title in Header */}
          <div className="flex-1 space-y-2 min-w-0">
            <div className="h-6 w-1/3 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
            <div className="h-3 w-16 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
          </div>
        </div>

        {/* Toolbar: Search + Sort Skeleton */}
        <div className="bg-white/80 dark:bg-ink-900/80 backdrop-blur-xl rounded-2xl p-3 sm:p-4 shadow-sm border border-ink-200/50 dark:border-ink-800/50 mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search input mock */}
            <div className="relative flex-1">
              <div className="h-10 w-full rounded-xl bg-ink-100 dark:bg-ink-950 border border-ink-200/50 dark:border-ink-800/50 animate-shimmer" />
            </div>

            {/* Sort select mock */}
            <div className="h-10 w-full sm:w-36 rounded-xl bg-ink-100 dark:bg-ink-950 border border-ink-200/50 dark:border-ink-800/50 animate-shimmer" />
          </div>
        </div>

        {/* Episodes List Container Skeleton */}
        <div className="bg-white/80 dark:bg-ink-900/80 backdrop-blur-xl rounded-[2rem] p-4 sm:p-6 lg:p-8 shadow-sm border border-ink-200/50 dark:border-ink-800/50">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="bg-white/60 dark:bg-ink-900/60 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-ink-100 dark:border-ink-800/40 shadow-sm flex gap-4 md:gap-6 items-center"
              >
                {/* Round Play Button Placeholder */}
                <div className="w-10 h-10 rounded-full bg-ink-200 dark:bg-ink-800 animate-shimmer flex-shrink-0 flex items-center justify-center">
                  <div className="w-4 h-4 bg-ink-300 dark:bg-ink-700 rounded" />
                </div>

                {/* Small Episode Cover Placeholder */}
                <div className="w-12 h-12 rounded-lg bg-ink-200 dark:bg-ink-800 animate-shimmer flex-shrink-0" />

                {/* Text Details Section */}
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-5 w-1/2 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
                  <div className="h-3 w-3/4 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer hidden md:block" />
                  {/* Meta elements */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-3 w-16 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
                    <span className="w-1 h-1 rounded-full bg-ink-200 dark:bg-ink-700" />
                    <div className="h-3 w-12 rounded bg-ink-200 dark:bg-ink-800 animate-shimmer" />
                  </div>
                </div>

                {/* Download Button Placeholder */}
                <div className="w-8 h-8 rounded-full bg-ink-200 dark:bg-ink-800 animate-shimmer flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
