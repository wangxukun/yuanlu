"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Heart,
  Search,
  Clock,
  Layers,
  Headphones,
  ChevronRight,
  Filter,
  Trash2,
} from "lucide-react";
import { FavoriteSeries, FavoriteEpisode } from "@/core/favorites/dto";
import {
  removePodcastFavoriteAction,
  removeEpisodeFavoriteAction,
} from "@/lib/actions/favorite-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface FavoritesPageProps {
  favoritePodcasts: FavoriteSeries[];
  favoriteEpisodes: FavoriteEpisode[];
}

const FavoritesPage: React.FC<FavoritesPageProps> = ({
  favoritePodcasts: initialPodcasts,
  favoriteEpisodes: initialEpisodes,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"podcasts" | "episodes">(
    "podcasts",
  );
  const [searchQuery, setSearchQuery] = useState("");

  // 本地状态用于乐观更新
  const [podcasts, setPodcasts] = useState(initialPodcasts);
  const [episodes, setEpisodes] = useState(initialEpisodes);

  // [修复] 确保顺序正确：[isPending, startTransition]
  const [isPending, startTransition] = useTransition();

  // 过滤逻辑
  const filteredPodcasts = useMemo(() => {
    return podcasts.filter(
      (p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.author.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [podcasts, searchQuery]);

  const filteredEpisodes = useMemo(() => {
    return episodes.filter(
      (e) =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.author?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [episodes, searchQuery]);

  // 处理跳转
  const handleSelectSeries = (id: string) => {
    router.push(`/podcast/${id}`);
  };

  const handlePlayEpisode = (id: string) => {
    router.push(`/episode/${id}`);
  };

  // 处理删除
  const handleRemove = (
    e: React.MouseEvent,
    type: "podcast" | "episode",
    id: string,
  ) => {
    e.stopPropagation();

    if (type === "podcast") {
      const prev = podcasts;
      setPodcasts((prev) => prev.filter((p) => p.id !== id)); // 乐观更新
      toast.success("已取消收藏");

      startTransition(async () => {
        const res = await removePodcastFavoriteAction(id);
        if (!res.success) {
          setPodcasts(prev); // 回滚
          console.log(isPending);
          toast.error("操作失败，请重试");
        }
      });
    } else {
      const prev = episodes;
      setEpisodes((prev) => prev.filter((ep) => ep.id !== id)); // 乐观更新
      toast.success("已取消收藏");

      startTransition(async () => {
        const res = await removeEpisodeFavoriteAction(id);
        if (!res.success) {
          setEpisodes(prev); // 回滚
          toast.error("操作失败，请重试");
        }
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
            <Heart className="mr-3 text-red-500 fill-red-500" size={32} />
            我的收藏
          </h1>
          <p className="text-gray-500 mt-2">
            这里汇集了你精心挑选的播客系列和高价值单集。
          </p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab("podcasts")}
            className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "podcasts"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            播客系列 ({podcasts.length})
          </button>
          <button
            onClick={() => setActiveTab("episodes")}
            className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "episodes"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            单集 ({episodes.length})
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder={`搜索收藏的${
              activeTab === "podcasts" ? "播客" : "单集"
            }...`}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="flex items-center space-x-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-colors shadow-sm text-sm">
          <Filter size={18} />
          <span>排序</span>
        </button>
      </div>

      {/* Content Grid */}
      {activeTab === "podcasts" ? (
        filteredPodcasts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPodcasts.map((series) => (
              <div
                key={series.id}
                onClick={() => handleSelectSeries(series.id)}
                className="group bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              >
                <div className="relative aspect-[4/3] bg-gray-100">
                  <img
                    src={series.thumbnailUrl}
                    alt={series.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="absolute top-3 right-3 flex space-x-2">
                    <button
                      onClick={(e) => handleRemove(e, "podcast", series.id)}
                      className="p-2 bg-white/90 backdrop-blur rounded-full text-red-500 hover:bg-white shadow-sm transition-colors"
                      title="取消收藏"
                    >
                      <Heart size={16} fill="currentColor" />
                    </button>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {series.category.slice(0, 3).map((category) => (
                      <span
                        key={category.id}
                        className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded uppercase tracking-wider"
                      >
                        {category.name}
                      </span>
                    ))}
                  </div>
                  <h3
                    className="font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors"
                    title={series.title}
                  >
                    {series.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 flex items-center">
                    {series.author && (
                      <span className="badge badge-ghost badge-xs mr-2">
                        {series.author}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50 text-[11px] text-gray-400 font-medium">
                    <div className="flex items-center">
                      <Layers size={12} className="mr-1" />
                      {series.episodeCount} 集
                    </div>
                    <div className="flex items-center">
                      <Headphones size={12} className="mr-1" />
                      {(series.plays / 1000).toFixed(0)}k 播放
                    </div>
                    <div className="flex items-center">
                      <Heart size={12} className="mr-1" />
                      {series.followers} 收藏
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState type="podcasts" />
        )
      ) : filteredEpisodes.length > 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {filteredEpisodes.map((episode) => (
            <div
              key={episode.id}
              onClick={() => handlePlayEpisode(episode.id)}
              className="group flex items-center p-4 sm:p-6 hover:bg-indigo-50/30 transition-all cursor-pointer relative"
            >
              <div className="w-32 h-18 sm:w-32 sm:h-18 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm bg-gray-100">
                <img
                  src={episode.thumbnailUrl}
                  alt={episode.title}
                  className="w-full h-full object-cover"
                />
                {/*<div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">*/}
                {/*    <PlayCircle className="text-white" size={32} />*/}
                {/*</div>*/}
              </div>

              <div className="ml-4 sm:ml-6 flex-1 min-w-0 pr-8">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                    {episode.category}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {episode.date}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                  {episode.title}
                </h4>
                <p className="text-sm text-gray-500 truncate">
                  系列: {episode.author}
                </p>
              </div>

              <div className="hidden md:flex items-center space-x-8 mr-12 text-gray-500">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-gray-900">
                    {episode.duration}
                  </span>
                  <div className="flex items-center text-[10px] mt-1">
                    <Clock size={10} className="mr-1" /> 时长
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-gray-900">
                    {episode.playCount?.toLocaleString()}
                  </span>
                  <div className="flex items-center text-[10px] mt-1">
                    <Headphones size={10} className="mr-1" /> 播放
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleRemove(e, "episode", episode.id)}
                  className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                  title="取消收藏"
                >
                  <Trash2 size={20} />
                </button>
                <ChevronRight
                  className="text-gray-300 group-hover:text-indigo-600 transition-colors"
                  size={24}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState type="episodes" />
      )}
    </div>
  );
};

const EmptyState = ({ type }: { type: "podcasts" | "episodes" }) => (
  <div className="py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-gray-100">
    <div className="mx-auto w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
      <Heart className="text-gray-200" size={48} />
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-2">
      还没有收藏任何{type === "podcasts" ? "播客" : "单集"}
    </h3>
    <p className="text-gray-500 max-w-sm mx-auto mb-8">
      开始探索并点击心形图标，将你喜欢的
      {type === "podcasts" ? "播客系列" : "精彩单集"}保存到这里以便稍后学习。
    </p>
    <a
      href="/discover"
      className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 inline-block"
    >
      去发现
    </a>
  </div>
);

export default FavoritesPage;
