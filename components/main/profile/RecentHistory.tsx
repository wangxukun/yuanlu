"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link"; // 用于路由跳转
import { PlayCircleIcon } from "@heroicons/react/24/solid";
import { RecentHistoryItemDto } from "@/core/listening-history/dto";
import { useRouter } from "next/navigation";

export default function RecentHistory() {
  const [history, setHistory] = useState<RecentHistoryItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/user/history/recent");
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch (error) {
        console.error("Error fetching recent history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // 点击"查看全部"跳转
  const handleViewAll = () => {
    router.push("/library/history");
  };

  if (loading) {
    return (
      <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 animate-pulse">
        <div className="h-6 bg-base-200 w-1/3 rounded mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-base-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-base-content">最近播放</h3>
        {/* 查看全部按钮 */}
        <button
          onClick={handleViewAll}
          className="text-sm font-medium text-primary hover:underline cursor-pointer transition-colors"
        >
          查看全部
        </button>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8 text-base-content/50 text-sm">
          暂无播放记录，去听听看吧！
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.historyId}
              className="group flex items-center gap-4 p-3 rounded-xl hover:bg-base-200/50 transition-colors border border-transparent hover:border-base-200"
            >
              {/* Cover & Play Button */}
              <div className="relative w-16 h-9 flex-shrink-0 rounded-lg overflow-hidden bg-base-300">
                <Image
                  src={item.coverUrl}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:opacity-80 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/episode/${item.episodeId}`}>
                    <PlayCircleIcon className="w-8 h-8 text-white drop-shadow-md" />
                  </Link>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-base-content truncate">
                  <Link
                    href={`/episode/${item.episodeId}`}
                    className="hover:text-primary"
                  >
                    {item.title}
                  </Link>
                </h4>
                <div className="flex items-center gap-3 mt-1.5">
                  {/* Progress Bar */}
                  <div className="flex-1 h-1.5 bg-base-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-base-content/50 tabular-nums">
                    {item.isFinished ? "已听完" : `${item.progress}%`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
