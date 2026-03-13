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
  PlayCircle,
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

  const [, startTransition] = useTransition();

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 xl:py-8 animate-in fade-in duration-500 font-sans overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-6 mb-6 xl:mb-8 border-b border-base-200 pb-6 xl:pb-8 transition-colors">
        <div>
          <h1 className="text-2xl xl:text-3xl font-extrabold text-base-content flex items-center">
            <Heart className="mr-3 text-error fill-error" size={28} />
            我的收藏
          </h1>
          <p className="text-base-content/60 mt-2 text-sm xl:text-base">
            这里汇集了你精心挑选的播客系列和高价值单集。
          </p>
        </div>

        <div className="flex bg-base-200 p-1 rounded-2xl w-full xl:w-auto transition-colors">
          <div className="grid grid-cols-2 w-full xl:flex xl:w-auto gap-1 xl:gap-0">
            <button
              onClick={() => setActiveTab("podcasts")}
              className={`flex-1 xl:flex-none px-4 xl:px-6 py-2.5 xl:py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${
                activeTab === "podcasts"
                  ? "bg-base-100 text-primary shadow-sm"
                  : "text-base-content/60 hover:text-base-content"
              }`}
            >
              播客系列 ({podcasts.length})
            </button>
            <button
              onClick={() => setActiveTab("episodes")}
              className={`flex-1 xl:flex-none px-4 xl:px-6 py-2.5 xl:py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${
                activeTab === "episodes"
                  ? "bg-base-100 text-primary shadow-sm"
                  : "text-base-content/60 hover:text-base-content"
              }`}
            >
              单集 ({episodes.length})
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 xl:mb-8 sticky top-0 z-10 xl:static bg-base-100/95 xl:bg-transparent backdrop-blur-md xl:backdrop-blur-none py-2 xl:py-0">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40"
          />
          <input
            type="text"
            placeholder={`搜索收藏的${
              activeTab === "podcasts" ? "播客" : "单集"
            }...`}
            className="w-full pl-10 pr-4 py-2.5 xl:py-3 bg-base-200/50 border border-base-200 rounded-xl xl:rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-sm text-sm text-base-content placeholder-base-content/40"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="hidden sm:flex items-center space-x-2 px-6 py-3 bg-base-100 border border-base-200 rounded-2xl text-base-content/70 font-bold hover:bg-base-200 transition-colors shadow-sm text-sm shrink-0">
          <Filter size={18} />
          <span>排序</span>
        </button>
      </div>

      {/* Content Grid */}
      {activeTab === "podcasts" ? (
        // --- 播客系列 Tab ---
        filteredPodcasts.length > 0 ? (
          <div className="flex flex-col gap-4 xl:grid xl:grid-cols-4 xl:gap-6">
            {filteredPodcasts.map((series) => (
              <div
                key={series.id}
                onClick={() => handleSelectSeries(series.id)}
                className="group bg-base-100 rounded-2xl xl:rounded-3xl border border-base-200 overflow-hidden shadow-sm hover:shadow-xl xl:hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-row xl:flex-col items-center xl:items-stretch p-3 xl:p-0 relative"
              >
                {/* Image Section */}
                <div className="relative w-24 h-24 xl:w-full xl:h-auto xl:aspect-square shrink-0 rounded-xl xl:rounded-none overflow-hidden bg-base-300">
                  <img
                    src={series.thumbnailUrl}
                    alt={series.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Desktop Hover Overlay */}
                  <div className="hidden xl:block absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {/* Desktop Heart Button */}
                  <div className="hidden xl:flex absolute top-3 right-3 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleRemove(e, "podcast", series.id)}
                      className="p-2 bg-base-100/90 backdrop-blur rounded-full text-error hover:bg-base-100 shadow-sm transition-colors"
                      title="取消收藏"
                    >
                      <Heart size={16} fill="currentColor" />
                    </button>
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 min-w-0 px-4 xl:p-5 flex flex-col justify-between h-full xl:h-auto space-y-1 xl:space-y-3">
                  <div>
                    {/* Desktop Categories */}
                    <div className="hidden xl:flex flex-wrap gap-1">
                      {series.category.slice(0, 3).map((category) => (
                        <span
                          key={category.id}
                          className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded uppercase tracking-wider"
                        >
                          {category.name}
                        </span>
                      ))}
                    </div>
                    {/* Mobile: Single Category Tag */}
                    <div className="xl:hidden flex items-center mb-1">
                      {series.category[0] && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase">
                          {series.category[0].name}
                        </span>
                      )}
                    </div>

                    <h3
                      className="font-bold text-base xl:text-lg text-base-content line-clamp-1 group-hover:text-primary transition-colors"
                      title={series.title}
                    >
                      {series.title}
                    </h3>
                    <p className="text-xs text-base-content/60 mt-0.5 xl:mt-1 flex items-center line-clamp-1">
                      {series.author || "Unknown Author"}
                    </p>

                    {/* Mobile Stats Row */}
                    <div className="xl:hidden flex items-center gap-3 mt-2 text-[10px] text-base-content/40">
                      <span className="flex items-center">
                        <Layers size={12} className="mr-1" />
                        {series.episodeCount}
                      </span>
                      <span className="flex items-center">
                        <Headphones size={12} className="mr-1" />
                        {series.plays > 999
                          ? (series.plays / 1000).toFixed(1) + "k"
                          : series.plays}
                      </span>
                      <span className="flex items-center">
                        <Heart size={12} className="mr-1" />
                        {series.followers}
                      </span>
                    </div>
                  </div>

                  {/* Desktop Stats */}
                  <div className="hidden xl:flex items-center justify-between pt-3 border-t border-base-200 text-[11px] text-base-content/40 font-medium">
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

                {/* Mobile Action Button (Right Aligned) */}
                <button
                  onClick={(e) => handleRemove(e, "podcast", series.id)}
                  className="xl:hidden p-2 text-error bg-error/10 rounded-full transition-colors self-center shrink-0 mr-1"
                >
                  <Heart size={18} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState type="podcasts" />
        )
      ) : // --- 单集 Tab ---
      filteredEpisodes.length > 0 ? (
        <div
          className={`
            w-full transition-all
            // Desktop: List Container Styles
            xl:bg-base-100 xl:rounded-3xl xl:border xl:border-base-200 xl:shadow-sm xl:overflow-hidden xl:divide-y xl:divide-base-200
            // Mobile: Grid Container Styles
            grid grid-cols-1 sm:grid-cols-2 gap-4 xl:block
          `}
        >
          {filteredEpisodes.map((episode) => (
            <div
              key={episode.id}
              onClick={() => handlePlayEpisode(episode.id)}
              className={`
                group relative cursor-pointer transition-all
                // Mobile Styles (Card)
                bg-base-100 rounded-2xl border border-base-200 shadow-sm flex flex-col overflow-hidden
                // Desktop Styles (List Row Override)
                xl:bg-transparent xl:rounded-none xl:border-none xl:shadow-none xl:flex-row xl:items-center xl:p-6 xl:hover:bg-base-200/50 xl:overflow-visible
              `}
            >
              {/* Image Section */}
              <div
                className={`
                  relative shrink-0 overflow-hidden
                  // Mobile: Full width, Aspect Video
                  w-full aspect-video
                  // Desktop: Fixed size
                  xl:w-32 xl:h-18 xl:aspect-auto xl:rounded-2xl xl:bg-base-300
                `}
              >
                <img
                  src={episode.thumbnailUrl}
                  alt={episode.title}
                  className="w-full h-full object-cover"
                />
                {/* Mobile Play Overlay */}
                <div className="xl:hidden absolute inset-0 bg-black/10 flex items-center justify-center">
                  <PlayCircle size={32} className="text-white/90 shadow-lg" />
                </div>
              </div>

              {/* Content Section */}
              <div className="flex-1 min-w-0 p-4 xl:p-0 xl:ml-6 xl:pr-8 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2 xl:mb-1">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded xl:bg-transparent xl:px-0 xl:py-0">
                      {episode.category}
                    </span>
                    <span className="hidden xl:inline text-base-content/30">
                      •
                    </span>
                    <span className="hidden xl:inline text-[10px] text-base-content/40 font-medium">
                      {episode.date}
                    </span>
                  </div>
                  <h4 className="text-base xl:text-lg font-bold text-base-content line-clamp-2 xl:truncate group-hover:text-primary transition-colors">
                    {episode.title}
                  </h4>
                  <p className="text-xs xl:text-sm text-base-content/60 truncate mt-1 xl:mt-0">
                    系列: {episode.author}
                  </p>
                </div>

                {/* Mobile Bottom Bar for Stats & Actions */}
                <div className="xl:hidden flex items-center justify-between mt-4 pt-3 border-t border-base-200 w-full">
                  <div className="flex items-center space-x-3 text-xs text-base-content/40">
                    <div className="flex items-center whitespace-nowrap">
                      <Clock size={12} className="mr-1" />
                      {episode.duration}
                    </div>
                    <div className="flex items-center whitespace-nowrap">
                      <Headphones size={12} className="mr-1" />
                      {episode.playCount?.toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleRemove(e, "episode", episode.id)}
                    className="p-1.5 text-error bg-error/10 rounded-lg hover:bg-error/20 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Desktop Only Stats */}
              <div className="hidden xl:flex items-center space-x-8 mr-12 text-base-content/40">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-base-content">
                    {episode.duration}
                  </span>
                  <div className="flex items-center text-[10px] mt-1">
                    <Clock size={10} className="mr-1" /> 时长
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-base-content">
                    {episode.playCount?.toLocaleString()}
                  </span>
                  <div className="flex items-center text-[10px] mt-1">
                    <Headphones size={10} className="mr-1" /> 播放
                  </div>
                </div>
              </div>

              {/* Desktop Only Actions */}
              <div className="hidden xl:flex items-center gap-2">
                <button
                  onClick={(e) => handleRemove(e, "episode", episode.id)}
                  className="p-3 text-error/70 hover:text-error hover:bg-error/10 rounded-full transition-all opacity-0 group-hover:opacity-100"
                  title="取消收藏"
                >
                  <Trash2 size={20} />
                </button>
                <ChevronRight
                  className="text-base-content/30 group-hover:text-primary transition-colors"
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
  <div className="py-20 text-center bg-base-100 rounded-[32px] border-2 border-dashed border-base-200 transition-colors w-full max-w-full overflow-hidden">
    <div className="mx-auto w-24 h-24 bg-base-200 rounded-full flex items-center justify-center mb-6">
      <Heart className="text-base-content/20" size={48} />
    </div>
    <h3 className="text-xl xl:text-2xl font-bold text-base-content mb-2 px-4">
      还没有收藏任何{type === "podcasts" ? "播客" : "单集"}
    </h3>
    <p className="text-base-content/60 max-w-sm mx-auto mb-8 text-sm xl:text-base px-4">
      开始探索并点击心形图标，将你喜欢的
      {type === "podcasts" ? "播客系列" : "精彩单集"}保存到这里以便稍后学习。
    </p>
    <a
      href="/discover"
      className="btn btn-primary rounded-full px-8 shadow-lg shadow-primary/20 text-sm xl:text-base"
    >
      去发现
    </a>
  </div>
);

export default FavoritesPage;
