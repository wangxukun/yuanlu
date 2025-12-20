"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2, Layers, Headphones, ExternalLink } from "lucide-react";
import { deletePodcast } from "@/lib/actions"; // 引入 Server Action

// 定义 Props，结合 Prisma 的返回类型和额外的统计字段
interface PodcastItemProps {
  podcast: {
    podcastid: string;
    title: string;
    author?: string; // 如果 schema 没有 author，可以用 platform 代替或者留空
    description: string | null;
    coverUrl: string | null;
    coverFileName: string | null;
    platform: string | null;
    totalPlays: number;
    isEditorPick: boolean | null;
    tags: { id: number; name: string }[];
    episodeCount: number; // 从 _count 注入
  };
}

export default function PodcastItem({ podcast }: PodcastItemProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm(`确定要删除合集 "${podcast.title}" 吗？这将同时删除封面图。`)) {
      startTransition(async () => {
        const res = await deletePodcast(
          podcast.podcastid,
          podcast.coverFileName || "",
        );
        if (res.status !== 200) {
          alert("删除失败: " + res.message);
        }
        // Server Action 使用 revalidatePath 后，页面会自动刷新，无需手动更新状态
      });
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full relative">
      {/* 推荐角标 */}
      {podcast.isEditorPick && (
        <div className="absolute top-3 right-3 z-20">
          <span className="badge badge-warning text-xs font-bold shadow-md">
            推荐
          </span>
        </div>
      )}

      {/* 封面区域 */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={podcast.coverUrl || "/static/images/default_cover.png"}
          alt={podcast.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>

        {/* 底部操作栏 (悬浮显示) */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <div className="flex gap-2 w-full justify-end">
            <Link
              href={`/admin/podcasts/${podcast.podcastid}/edit`}
              className="p-2 bg-white/90 text-indigo-600 rounded-lg hover:bg-white hover:text-indigo-700 transition-colors shadow-sm"
              title="编辑合集信息"
            >
              <Pencil size={16} />
            </Link>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="p-2 bg-red-500/90 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50"
              title="删除合集"
            >
              {isPending ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <Trash2 size={16} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-5 space-y-3 flex-1 flex flex-col">
        <div className="flex justify-between items-start">
          <div className="flex flex-wrap gap-1">
            {podcast.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase"
              >
                {tag.name}
              </span>
            ))}
          </div>
          <div className="flex items-center text-gray-400 text-xs shrink-0">
            <Layers size={12} className="mr-1" />
            <span>{podcast.episodeCount} 集</span>
          </div>
        </div>

        <div>
          <h3
            className="font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors text-lg"
            title={podcast.title}
          >
            {podcast.title}
          </h3>
          <p className="text-xs text-gray-500 mt-1 flex items-center">
            {podcast.platform && (
              <span className="badge badge-ghost badge-xs mr-2">
                {podcast.platform}
              </span>
            )}
          </p>
        </div>

        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed flex-1">
          {podcast.description || "暂无简介"}
        </p>

        <div className="pt-4 border-t border-gray-50 flex items-center justify-between mt-auto">
          <div className="flex items-center text-xs text-gray-400">
            <Headphones size={12} className="mr-1" />
            {(podcast.totalPlays / 1000).toFixed(1)}k
          </div>

          {/* 核心操作：跳转到该 Podcast 下的音频管理 */}
          <Link
            href={`/admin/episodes?podcastId=${podcast.podcastid}`}
            className="btn btn-sm btn-ghost text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 px-2 -mr-2"
          >
            管理音频
            <ExternalLink size={14} className="ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
