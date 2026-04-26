// app/(main)/search/page.tsx
import React, { Suspense } from "react";
import { Metadata } from "next";
import SearchResultsContent from "./SearchResultsContent";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q || "";
  return {
    title: query ? `"${query}" 的搜索结果 | 远路播客` : "搜索 | 远路播客",
    description: query
      ? `在远路播客中搜索"${query}"，发现最适合你的英语学习播客。`
      : "搜索和发现远路播客中的英语学习内容。",
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q || "";

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-24">
      <div className="px-6 lg:px-8 py-10 max-w-7xl mx-auto">
        {/* Page heading */}
        <div className="mb-10">
          <h1
            className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {query ? (
              <>
                搜索 &ldquo;
                <span className="text-indigo-600 dark:text-indigo-400">
                  {query}
                </span>
                &rdquo;
              </>
            ) : (
              "搜索播客"
            )}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {query
              ? "根据标题、标签、描述为你找到以下播客"
              : "在上方搜索栏输入关键词，按标题、标签和描述查找播客"}
          </p>
        </div>

        {/* Results */}
        <Suspense
          fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square rounded-[1rem] bg-slate-200 dark:bg-slate-800 mb-4" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-3/4 mb-2" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full w-1/2" />
                </div>
              ))}
            </div>
          }
        >
          <SearchResultsContent query={query} />
        </Suspense>
      </div>
    </div>
  );
}
