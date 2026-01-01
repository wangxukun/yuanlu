// yuanlu/app/(main)/discover/DiscoverSearch.tsx
"use client";

import React from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export default function DiscoverSearch() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // 获取当前搜索词
  const currentQuery = searchParams.get("query")?.toString() || "";

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set("query", term);
    } else {
      params.delete("query");
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  // 清空搜索
  const clearSearch = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("query");
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="relative mt-4">
      <input
        type="text"
        placeholder="搜索“日常生活”或“新闻”......"
        defaultValue={currentQuery}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full pl-10 xl:pl-12 pr-10 xl:pr-12 py-3 xl:py-4 rounded-xl xl:rounded-2xl border border-base-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base-content bg-base-100 placeholder:text-base-content/40 text-sm xl:text-base"
      />

      <div className="absolute left-3 xl:left-4 top-1/2 -translate-y-1/2 text-base-content/40">
        <MagnifyingGlassIcon className="w-5 h-5 xl:w-6 xl:h-6" />
      </div>

      <div className="absolute right-2 xl:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {currentQuery && (
          <button
            onClick={clearSearch}
            className="p-2 text-base-content/40 hover:text-base-content hover:bg-base-200 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
        <button className="p-2 text-base-content/40 hover:text-base-content hover:bg-base-200 rounded-lg transition-colors">
          <AdjustmentsHorizontalIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
