"use client";

import React, { useState, useEffect } from "react";
import { Episode, Status, Access } from "@/app/lib/types";
import { MOCK_EPISODES } from "@/app/lib/constants";
import {
  PlayIcon,
  HeartIcon,
  BookmarkIcon,
  ShareIcon,
  MessageSquareIcon,
  EditIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "./Icons";
import ActionDropdown from "./ActionDropdown";

const ITEMS_PER_PAGE = 10;

const EpisodeTable: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [data] = useState<Episode[]>(MOCK_EPISODES);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const formatNumber = (num: number) => {
    return num >= 1000 ? (num / 1000).toFixed(1) + "k" : num.toString();
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case Status.PUBLISHED:
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case Status.REVIEWING:
        return "bg-amber-100 text-amber-800 border-amber-200";
      case Status.DRAFT:
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getAccessColor = (access: Access) => {
    switch (access) {
      case Access.FREE:
        return "bg-sky-100 text-sky-700";
      case Access.MEMBER:
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  // 在客户端渲染前显示加载状态，避免hydration错误
  if (!isClient) {
    return (
      <div className="w-full flex flex-col gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="min-h-[600px] flex items-center justify-center">
            <div className="loading loading-spinner loading-md"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Table Container */}
        <div className="overflow-x-auto min-h-[600px] visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4 w-[350px]">播客信息</th>
                <th className="px-4 py-4 text-center">状态</th>
                <th className="px-4 py-4 text-center">权限</th>
                <th className="px-4 py-4 text-center">数据统计</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.map((episode) => (
                <tr
                  key={episode.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  {/* Episode Info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden shadow-sm border border-slate-100">
                        <img
                          src={episode.coverUrl}
                          alt={episode.title}
                          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="min-w-0">
                        <h3
                          className="text-sm font-semibold text-slate-900 truncate max-w-[220px] mb-1"
                          title={episode.title}
                        >
                          {episode.title}
                        </h3>
                        <div className="flex flex-col gap-0.5 text-xs text-slate-500">
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
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(episode.status)}`}
                    >
                      {episode.status}
                    </span>
                  </td>

                  {/* Access */}
                  <td className="px-4 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccessColor(episode.access)}`}
                    >
                      {episode.access}
                    </span>
                  </td>

                  {/* Stats */}
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-4 text-slate-500 text-xs">
                      <div
                        className="flex flex-col items-center gap-1 group/stat"
                        title="播放数"
                      >
                        <PlayIcon
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
                          className="group-hover/stat:text-rose-500 transition-colors"
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
                          className="group-hover/stat:text-amber-500 transition-colors"
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
                          className="group-hover/stat:text-indigo-500 transition-colors"
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
                          className="group-hover/stat:text-sky-500 transition-colors"
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
                      <button
                        className="p-2 text-slate-400 hover:text-primary hover:bg-indigo-50 rounded-full transition-colors"
                        title="编辑"
                      >
                        <EditIcon size={18} />
                      </button>
                      <ActionDropdown episodeId={episode.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            显示{" "}
            <span className="font-medium text-slate-900">{startIndex + 1}</span>{" "}
            到{" "}
            <span className="font-medium text-slate-900">
              {Math.min(startIndex + ITEMS_PER_PAGE, data.length)}
            </span>{" "}
            条，共{" "}
            <span className="font-medium text-slate-900">{data.length}</span> 条
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-md border border-slate-300 bg-white text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <ChevronLeftIcon size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                  currentPage === page
                    ? "bg-primary text-white border border-primary shadow-sm"
                    : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-md border border-slate-300 bg-white text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <ChevronRightIcon size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EpisodeTable;
