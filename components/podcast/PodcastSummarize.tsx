"use client";

import React, { useOptimistic, useTransition } from "react";
import Image from "next/image";
import {
  HeartIcon as HeartOutline,
  PlayIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import { togglePodcastFavorite } from "@/lib/actions/favorite-actions";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Podcast } from "@/core/podcast/podcast.entity"; // 假设你安装了 sonner 或使用 alert

interface PodcastSummarizeProps {
  podcast: Podcast & {
    isFavorited?: boolean; // 需要从上层组件(Server Component)传入当前用户的收藏状态
  };
}

export default function PodcastSummarize({ podcast }: PodcastSummarizeProps) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // 乐观更新 UI
  const [optimisticFav, setOptimisticFav] = useOptimistic(
    { isFavorited: !!podcast.isFavorited, count: podcast.followerCount || 0 },
    (state, newStatus: boolean) => ({
      isFavorited: newStatus,
      count: newStatus ? state.count + 1 : state.count - 1,
    }),
  );

  const handleFavorite = () => {
    startTransition(async () => {
      const targetStatus = !optimisticFav.isFavorited;
      setOptimisticFav(targetStatus); // 立即更新 UI

      const res = await togglePodcastFavorite(podcast.podcastid, pathname);
      if (!res.success) {
        toast.error(res.message);
        // 如果失败，React useOptimistic 会自动回滚吗？
        // useOptimistic 会在下次渲染时重置为 props 的值，所以需要配合 router.refresh()
        // 但这里我们简单处理：报错提示即可
      }
    });
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
      {/* 封面图保持不变 */}
      <div className="relative w-48 h-48 md:w-64 md:h-64 flex-shrink-0 rounded-2xl overflow-hidden shadow-xl">
        <Image
          src={podcast.coverUrl}
          alt={podcast.title}
          fill
          className="object-cover"
        />
      </div>

      <div className="flex-1 space-y-4 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-bold text-base-content">
          {podcast.title}
        </h1>
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-base-content/70">
          <span>{podcast.platform || "Yuanlu"}</span>
          <span>•</span>
          {/* 展示真实播放量 */}
          <span>{(podcast.totalPlays || 0).toLocaleString()} 次播放</span>
          <span>•</span>
          {/* 展示乐观更新后的订阅数 */}
          <span>{optimisticFav.count.toLocaleString()} 人订阅</span>
        </div>

        <p className="text-base-content/80 max-w-2xl leading-relaxed">
          {podcast.description || "暂无简介"}
        </p>

        <div className="flex items-center gap-3 justify-center md:justify-start pt-2">
          <button className="btn btn-primary rounded-full px-8 text-white">
            <PlayIcon className="w-5 h-5 mr-2" />
            播放全部
          </button>

          {/* 收藏按钮 */}
          <button
            className="btn btn-circle btn-ghost border border-base-300 hover:bg-base-200"
            onClick={handleFavorite}
            disabled={isPending}
          >
            {optimisticFav.isFavorited ? (
              <HeartSolid className="w-6 h-6 text-red-500" />
            ) : (
              <HeartOutline className="w-6 h-6" />
            )}
          </button>

          <button className="btn btn-circle btn-ghost border border-base-300 hover:bg-base-200">
            <ShareIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
