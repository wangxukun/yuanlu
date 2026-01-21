"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Hash,
  Layers,
  Headphones,
  Filter,
  PlayCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

// [新增] 难度映射表：将用户配置的粗粒度等级映射为剧集的细粒度 CEFR 标准
const LEVEL_MAPPING: Record<string, string> = {
  All: "全部",
  Beginner: "初级",
  Intermediate: "中级",
  Advanced: "高级",
};

// 定义与后端数据对齐的接口
export interface SeriesTag {
  id: number;
  name: string;
}

export interface Series {
  id: string;
  title: string;
  thumbnailUrl: string;
  description: string | null;
  level: "Beginner" | "Intermediate" | "Advanced" | "All"; // 我们将在服务端计算这个字段
  category: string; // 主分类
  tags: SeriesTag[];
  episodeCount: number;
  plays: number;
}

interface TagCollectionsProps {
  tagName: string;
  allSeries: Series[];
}

const SeriesListClient: React.FC<TagCollectionsProps> = ({
  tagName,
  allSeries,
}) => {
  const router = useRouter();
  const [filterLevel, setFilterLevel] = useState<
    "All" | "Beginner" | "Intermediate" | "Advanced"
  >("All");

  // 交互处理函数
  const handleBack = () => router.back();
  const handleSelectSeries = (series: Series) => {
    router.push(`/podcast/${series.id}`);
  };

  // 过滤逻辑
  const filteredSeries = useMemo(() => {
    return allSeries.filter((series) => {
      // 检查标签或分类是否匹配 (服务端已经根据 category 筛选过了，这里主要做二次确认或前端搜索)
      // 这里我们假设传入的 allSeries 已经是匹配 tagName 的了，主要过滤 Level
      const matchesLevel =
        filterLevel === "All" || series.level === filterLevel;
      return matchesLevel;
    });
  }, [allSeries, filterLevel]);

  return (
    <div className="min-h-screen bg-base-200 pb-20 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white pt-8 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 transform translate-x-1/3 -translate-y-1/4">
          <Hash size={400} />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-base-200 to-transparent"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-400 hover:text-white transition-colors mb-6 group cursor-pointer"
          >
            <div className="p-1 rounded-full bg-white/10 group-hover:bg-white/20 mr-2 transition-colors">
              <ArrowLeft size={16} />
            </div>
            返回发现页
          </button>

          <div className="flex items-center space-x-4">
            <div className="bg-indigo-500/20 p-4 rounded-3xl border border-indigo-500/30 backdrop-blur-sm">
              <Hash size={48} className="text-indigo-400" />
            </div>
            <div>
              <span className="text-indigo-400 font-bold tracking-wider uppercase text-sm">
                主题合集
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-1 capitalize">
                {tagName}
              </h1>
            </div>
          </div>

          <p className="mt-6 text-gray-400 max-w-2xl text-lg leading-relaxed">
            探索我们精心挑选的
            <span className="text-white font-medium">{tagName}</span>
            主题播客系列。
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        {/* Filters */}
        <div className="bg-base-100 p-2 rounded-2xl shadow-sm border border-base-200 flex items-center justify-between mb-8 overflow-x-auto">
          <div className="flex items-center space-x-1">
            {["All", "Beginner", "Intermediate", "Advanced"].map((level) => (
              <button
                key={level}
                onClick={() =>
                  setFilterLevel(
                    level as "All" | "Beginner" | "Intermediate" | "Advanced",
                  )
                }
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterLevel === level
                    ? "bg-slate-900 text-white shadow-md"
                    : "text-base-content/60 hover:bg-base-200 hover:text-base-content"
                }`}
              >
                {LEVEL_MAPPING[level]}
              </button>
            ))}
          </div>
          <div className="hidden sm:flex items-center px-4 text-base-content/40">
            <Filter size={16} className="mr-2" />
            <span className="text-xs font-medium uppercase tracking-wider">
              {filteredSeries.length} 结果
            </span>
          </div>
        </div>

        {/* Series Grid */}
        {filteredSeries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredSeries.map((series) => (
              <div
                key={series.id}
                onClick={() => handleSelectSeries(series)}
                className="group bg-base-100 rounded-3xl border border-base-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full"
              >
                {/* Thumbnail */}
                <div className="relative aspect-square overflow-hidden bg-base-200">
                  <img
                    src={series.thumbnailUrl}
                    alt={series.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="flex items-center space-x-2 bg-white/20 backdrop-blur-md border border-white/30 text-white px-6 py-2 rounded-full font-bold">
                      <PlayCircle size={20} />
                      <span>查看剧集</span>
                    </span>
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded-md border border-white/10">
                      {series.level}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                  <div className="mb-auto">
                    <h3 className="text-xl font-bold text-base-content mb-2 leading-tight group-hover:text-primary transition-colors">
                      {series.title}
                    </h3>
                    <p className="text-sm text-base-content/60 line-clamp-2 mb-4">
                      {series.description || "No description available."}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {series.tags?.slice(0, 3).map((tag) => (
                      <span
                        key={tag.id}
                        className="text-[10px] font-medium bg-base-200 text-base-content/70 px-2 py-1 rounded-md border border-base-300"
                      >
                        #{tag.name}
                      </span>
                    ))}
                  </div>

                  {/* Footer Stats */}
                  <div className="pt-4 border-t border-base-200 flex items-center justify-between text-xs font-medium text-base-content/40">
                    <div className="flex items-center">
                      <Layers size={14} className="mr-1.5" />
                      {series.episodeCount} 集
                    </div>
                    <div className="flex items-center">
                      <Headphones size={14} className="mr-1.5" />
                      {series.plays > 1000
                        ? `${(series.plays / 1000).toFixed(1)}k`
                        : series.plays}{" "}
                      播放
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-base-100 rounded-3xl p-12 text-center border border-base-200 border-dashed">
            <div className="w-20 h-20 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Hash size={32} className="text-base-content/30" />
            </div>
            <h3 className="text-xl font-bold text-base-content mb-2">
              未找到任何系列
            </h3>
            <p className="text-base-content/60 max-w-md mx-auto">
              我们找不到任何与标签“{tagName}”匹配且符合所选过滤条件的播客系列。
            </p>
            <button
              onClick={() => setFilterLevel("All")}
              className="mt-6 text-primary font-bold hover:text-primary-focus cursor-pointer"
            >
              清除过虑
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeriesListClient;
