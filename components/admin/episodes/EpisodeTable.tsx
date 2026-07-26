"use client";

import React, { useState, useEffect } from "react";
// import { MOCK_EPISODES } from "@/lib/constants"; // 不需要了
import {
  HeartIcon,
  BookmarkIcon,
  ShareIcon,
  MessageSquareIcon,
  EditIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "./Icons";
import ActionDropdown from "./ActionDropdown";
import {
  Access,
  EpisodeManagementItem,
  Status,
} from "@/core/episode/dto/episode-management-item";
import Link from "next/link";
import { Headphones } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function EpisodeTable({
  items = [],
  total = 0,
  currentPage = 1,
  limit = 10,
}: {
  items: EpisodeManagementItem[];
  total: number;
  currentPage: number;
  limit: number;
}) {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const totalPages = Math.ceil(total / limit);
  const startIndex = (currentPage - 1) * limit;

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const currentItems = items;

  const formatNumber = (num: number) => {
    return num >= 1000 ? (num / 1000).toFixed(1) + "k" : num.toString();
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case Status.PUBLISHED:
        return "bg-primary-100 text-primary-800 border-primary-200";
      case Status.REVIEWING:
        return "bg-accent-100 text-accent-800 border-accent-200";
      default:
        return "bg-ink-100 text-ink-800";
    }
  };

  const getAccessColor = (access: Access) => {
    switch (access) {
      case Access.FREE:
        return "bg-info-100 text-info-700";
      case Access.MEMBER:
        return "bg-accent-100 text-accent-700";
      default:
        return "bg-ink-100 text-ink-700";
    }
  };

  if (!isClient) {
    return (
      <div className="w-full flex flex-col gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-ink-200 overflow-hidden">
          <div className="min-h-[600px] flex items-center justify-center">
            <div className="loading loading-spinner loading-md"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-ink-200 overflow-hidden">
        {/* Table Container */}
        <div className="overflow-x-auto min-h-[600px] visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-ink-50 border-b border-ink-200 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                <th className="px-6 py-4 w-[350px]">播客信息</th>
                <th className="px-4 py-4 text-center">状态</th>
                <th className="px-4 py-4 text-center">权限</th>
                <th className="px-4 py-4 text-center">数据统计</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-ink-400">
                    没有找到符合条件的音频
                  </td>
                </tr>
              ) : (
                currentItems.map((episode) => (
                  <tr
                    key={episode.id}
                    className="hover:bg-ink-50/80 transition-colors group"
                  >
                    {/* Episode Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden shadow-sm border border-ink-100">
                          <img
                            src={episode.coverUrl}
                            alt={episode.title}
                            className="w-full h-full object-fill transform group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="min-w-0">
                          <h3
                            className="text-sm font-semibold text-ink-900 truncate max-w-[220px] mb-1"
                            title={episode.title}
                          >
                            {episode.title}
                          </h3>
                          <div className="flex flex-col gap-0.5 text-xs text-ink-500">
                            <span>发布: {episode.publishDate}</span>
                            <span className="opacity-70">
                              时长: {episode.duration}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                          episode.status,
                        )}`}
                      >
                        {episode.status}
                      </span>
                    </td>

                    {/* Access */}
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccessColor(
                          episode.access,
                        )}`}
                      >
                        {episode.access}
                      </span>
                    </td>

                    {/* Stats */}
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-4 text-ink-500 text-xs">
                        <div
                          className="flex flex-col items-center gap-1 group/stat"
                          title="播放数"
                        >
                          <Headphones
                            size={14}
                            className="group-hover/stat:text-primary transition-colors"
                          />
                          <span className="font-medium">
                            {formatNumber(episode.stats.plays)}
                          </span>
                        </div>
                        <div
                          className="flex flex-col items-center gap-1 group/stat"
                          title="点赞数"
                        >
                          <HeartIcon
                            size={14}
                            className="group-hover/stat:text-error-500 transition-colors"
                          />
                          <span className="font-medium">
                            {formatNumber(episode.stats.likes)}
                          </span>
                        </div>
                        <div
                          className="flex flex-col items-center gap-1 group/stat"
                          title="收藏数"
                        >
                          <BookmarkIcon
                            size={14}
                            className="group-hover/stat:text-accent-500 transition-colors"
                          />
                          <span className="font-medium">
                            {formatNumber(episode.stats.favorites)}
                          </span>
                        </div>
                        <div
                          className="flex flex-col items-center gap-1 group/stat"
                          title="分享数"
                        >
                          <ShareIcon
                            size={14}
                            className="group-hover/stat:text-primary-500 transition-colors"
                          />
                          <span className="font-medium">
                            {formatNumber(episode.stats.shares)}
                          </span>
                        </div>
                        <div
                          className="flex flex-col items-center gap-1 group/stat"
                          title="评论数"
                        >
                          <MessageSquareIcon
                            size={14}
                            className="group-hover/stat:text-info-500 transition-colors"
                          />
                          <span className="font-medium">
                            {formatNumber(episode.stats.comments)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/episodes/${episode.id}/edit`}
                          className="p-2 text-ink-400 hover:text-primary hover:bg-primary-50 rounded-full transition-colors"
                          title="编辑"
                        >
                          <EditIcon size={18} />
                        </Link>
                        <ActionDropdown episodeId={episode.id} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="p-4 sm:px-6 sm:py-4 bg-ink-50 border-t border-ink-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-ink-500">
              显示{" "}
              <span className="font-medium text-ink-900">{startIndex + 1}</span>{" "}
              到{" "}
              <span className="font-medium text-ink-900">
                {Math.min(startIndex + limit, total)}
              </span>{" "}
              条，共 <span className="font-medium text-ink-900">{total}</span>{" "}
              条
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md border border-ink-300 bg-white text-ink-600 text-sm hover:bg-ink-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <ChevronLeftIcon size={16} />
              </button>
              {/* 简单的分页逻辑，如果页数太多可能需要更复杂的 Pagination 组件 */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => {
                  // 简单优化：只显示当前页附近和收尾页（这里暂不实现复杂逻辑，仅展示全部页码，若页码过多建议后续优化）
                  if (
                    totalPages > 10 &&
                    Math.abs(page - currentPage) > 2 &&
                    page !== 1 &&
                    page !== totalPages
                  ) {
                    if (Math.abs(page - currentPage) === 3)
                      return (
                        <span key={page} className="px-1">
                          ...
                        </span>
                      );
                    return null;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                        currentPage === page
                          ? "bg-primary text-white border border-primary shadow-sm"
                          : "bg-white text-ink-600 border border-ink-300 hover:bg-ink-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                },
              )}
              <button
                onClick={() =>
                  handlePageChange(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md border border-ink-300 bg-white text-ink-600 text-sm hover:bg-ink-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <ChevronRightIcon size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
