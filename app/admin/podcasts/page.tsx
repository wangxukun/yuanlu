import React from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import PodcastItem from "@/components/admin/podcasts/PodcastItem";
import { Prisma } from "@prisma/client";
import { getAdminPodcasts } from "@/lib/admin-podcasts-service";

// 定义查询参数的类型
interface PageProps {
  searchParams?: Promise<{
    query?: string;
    page?: string;
  }>;
}

export default async function PodcastManagementPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const query = searchParams?.query || "";
  // 构建 Prisma 查询条件, 只要下面任意一个条件匹配，就返回该记录
  const whereCondition: Prisma.podcastWhereInput = query
    ? {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { platform: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const podcasts = await getAdminPodcasts(whereCondition);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* 头部区域 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">播客合集管理</h1>
          <p className="text-gray-500 mt-1">
            管理英语学习播客系列，创建、编辑或上传新内容。
          </p>
        </div>
        <Link
          href="/admin/podcasts/create"
          className="btn btn-primary text-white px-6 rounded-xl font-bold shadow-lg shadow-indigo-100"
        >
          <Plus size={20} className="mr-2" />
          创建新合集
        </Link>
      </div>

      {/* 搜索栏 (使用 Form 实现服务端搜索) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <form className="relative flex-1 w-full">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            name="query"
            defaultValue={query}
            type="text"
            placeholder="搜索合集名称、描述或平台..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 transition-all"
          />
        </form>
      </div>

      {/* 内容网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {podcasts.map((podcast) => (
          <div key={podcast.podcastid} className="h-full">
            {/* 传递序列化后的数据 */}
            <PodcastItem
              podcast={{
                ...podcast,
                episodeCount: podcast._count.episode,
              }}
            />
          </div>
        ))}

        {/* 新建占位卡片 */}
        <Link
          href="/admin/podcasts/create"
          className="border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all group min-h-[300px] h-full"
        >
          <div className="p-4 bg-gray-50 rounded-full mb-4 group-hover:bg-white group-hover:shadow-md transition-all">
            <Plus size={32} />
          </div>
          <span className="font-bold">创建新合集</span>
        </Link>
      </div>

      {podcasts.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-500">未找到相关播客数据</p>
        </div>
      )}
    </div>
  );
}
