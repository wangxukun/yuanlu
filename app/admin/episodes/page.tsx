import React, { Suspense } from "react";
import EpisodeTable from "@/components/admin/episodes/EpisodeTable";
import { MicIcon } from "@/components/admin/episodes/Icons";
import Link from "next/link";
import Search from "@/components/search";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// 定义页面参数类型
interface PageProps {
  searchParams?: Promise<{
    query?: string;
    podcastId?: string;
    page?: string;
  }>;
}

// 提取搜索栏为单独组件以便包裹 Suspense
function SearchBar() {
  return (
    <div className="flex-1 sm:w-64">
      <Search placeholder="搜索标题..." />
    </div>
  );
}

export default async function Page(props: PageProps) {
  // 1. 解析参数 (Next.js 15 中 searchParams 是 Promise)
  const searchParams = await props.searchParams;
  const query = searchParams?.query || "";
  const podcastId = searchParams?.podcastId || "";

  // 2. 构建 API 参数
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (podcastId) params.set("podcastId", podcastId);

  // 3. 请求数据
  // [关键修复]: 添加 cache: 'no-store' 禁用缓存，解决搜索后列表不更新的问题
  const result = await fetch(
    `${baseUrl}/api/episode/management-list?${params.toString()}`,
    {
      cache: "no-store",
    },
  );

  // 安全处理 JSON 解析，防止空数据报错
  let episodeManagementItems = [];
  try {
    episodeManagementItems = await result.json();
  } catch (e) {
    console.error("Failed to parse episodes", e);
  }

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 统计概览区域 (Stats) - 保持不变 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "总单集数",
              value: "1,284",
              change: "+12%",
              color: "text-primary",
            },
            {
              label: "本周播放",
              value: "45.2k",
              change: "+5.4%",
              color: "text-emerald-600",
            },
            {
              label: "新增订阅",
              value: "892",
              change: "+2.1%",
              color: "text-amber-600",
            },
            {
              label: "平均完播率",
              value: "68%",
              change: "-0.5%",
              color: "text-rose-600",
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col"
            >
              <span className="text-xs text-slate-500 font-medium mb-1">
                {stat.label}
              </span>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-slate-900">
                  {stat.value}
                </span>
                <span
                  className={`text-xs font-medium bg-slate-50 px-2 py-1 rounded-md ${stat.color}`}
                >
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 工具栏：筛选按钮 + 搜索框 + 投稿按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          {/* 左侧：快捷状态筛选 */}
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
              全部
            </button>
            <button className="px-4 py-2 bg-transparent border border-transparent rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all">
              已发布
            </button>
            <button className="px-4 py-2 bg-transparent border border-transparent rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all">
              审核中
            </button>
          </div>

          {/* 右侧：搜索 + 投稿 */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* [关键修复]: 使用 Suspense 包裹 Search 组件 */}
            <Suspense
              fallback={
                <div className="w-64 h-10 bg-gray-100 rounded animate-pulse" />
              }
            >
              <SearchBar />
            </Suspense>

            <Link
              href="/admin/episodes/contribute"
              className="shrink-0 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
            >
              <MicIcon size={16} />
              投稿
            </Link>
          </div>
        </div>

        {/* 筛选状态提示：如果在筛选特定播客 */}
        {podcastId && (
          <div className="text-sm text-gray-500 mb-2 flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-lg w-fit">
            <span>
              正在筛选播客ID:{" "}
              <span className="font-mono font-bold">
                {podcastId.slice(0, 8)}...
              </span>
            </span>
            <Link
              href="/admin/episodes"
              className="text-xs bg-white border px-2 py-0.5 rounded hover:bg-gray-100 text-gray-700 transition-colors"
            >
              清除筛选
            </Link>
          </div>
        )}

        {/* 数据表格 */}
        <EpisodeTable episodeManagementItems={episodeManagementItems} />
      </div>
    </main>
  );
}
