"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Podcast {
  categoryid: number;
  title: string;
  description: string;
  coverUrl: string;
  coverFileName?: string;
  from: string;
}

interface ListProps {
  title: string;
  items: Podcast[];
}

export default function List({ title, items }: ListProps) {
  const router = useRouter();
  const displayedItems = items.slice(0, 8);
  const showMoreLink = items.length > 8;

  // 处理卡片点击
  const handleItemClick = (id: number) => {
    const encodedId = encodeURIComponent(id);
    router.push(`/category/${encodedId}`);
  };

  // 处理更多链接点击
  const handleMoreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const encodedCategory = encodeURIComponent(title);
    router.push(`/series/${encodedCategory}`);
  };

  return (
    <div className="bg-gray-50 rounded-xl p-6 w-full max-w-7xl">
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-lg font-bold text-slate-500">{title}</h2>

        {showMoreLink && (
          <a
            href={`/series/${encodeURIComponent(title)}`}
            onClick={handleMoreClick}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span className="text-sm font-medium">更多</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        )}
      </div>

      {/* 四列网格布局 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayedItems.map((item, index) => (
          <div
            key={index}
            role="button"
            onClick={() => handleItemClick(item.categoryid)}
            className="group relative bg-white rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
          >
            {/* 图片容器 */}
            <div className="relative h-48 w-48 mb-4 rounded-md overflow-hidden">
              <Image
                src={item.coverUrl}
                alt={item.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />

              {/* 播放图标 */}
              <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/50 rounded-full p-2 backdrop-blur-sm">
                  <svg
                    className="w-6 h-6 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 内容区块 */}
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
                {item.title}
              </h3>
              <p className="text-sm text-gray-500">{item.from}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
