import { lusitana } from "@/components/fonts";
import prisma from "@/lib/prisma";
import TagManager from "@/components/admin/tags/tag-manager";
import { Suspense } from "react";
import { Prisma } from "@prisma/client";

// 强制动态渲染，确保获取最新数据
export const dynamic = "force-dynamic";

async function getTags() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: {
        id: Prisma.SortOrder.desc,
      },
      include: {
        _count: {
          select: {
            podcasts: true,
            episodes: true,
          },
        },
      },
    });
    return tags;
  } catch (error) {
    console.error("Failed to fetch tags:", error);
    return [];
  }
}

export default async function Page() {
  const tags = await getTags();
  const fallback = <div className="text-center py-10">加载数据中...</div>;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1
          className={`${lusitana.className} text-3xl font-bold text-gray-900`}
        >
          标签管理
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          管理全站的英语学习标签，查看关联的播客和单集数量。
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <Suspense fallback={fallback}>
          <TagManager initialTags={tags} />
        </Suspense>
      </div>
    </div>
  );
}
