"use client";

import { useState } from "react";
import Image from "next/image";

interface ProgramSummarizeProps {
  title: string; // 节目标题
  episodes: number; // 节目集数
  publisher: string; // 节目发布者
  description: string; // 节目描述
  imageUrl: string; // 节目图片地址
  initialCollected?: boolean; // 初始收藏状态（可选，默认为 false）
}

export default function ProgramSummarize({
  title,
  episodes,
  publisher,
  description,
  imageUrl,
  initialCollected = false,
}: ProgramSummarizeProps) {
  // 状态管理：收藏状态
  const [isCollected, setIsCollected] = useState(initialCollected);

  return (
    // 最外层容器
    <div className="bg-white rounded-xl shadow-md p-6 max-w-96">
      {/* 图片展示区域 */}
      <div className="relative h-80 w-full mb-4 rounded-lg overflow-hidden">
        <Image
          src={imageUrl} // 图片地址
          alt={title} // 图片替代文本
          fill // 填充容器
          className="object-cover" // 图片裁剪方式
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" // 响应式图片尺寸
        />
      </div>

      {/* 标题和操作区 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          {/* 节目标题 */}
          <h1 className="text-lg font-bold text-gray-800">{title}</h1>
          {/* 节目信息（集数和发布者） */}
          <div className="text-sm text-gray-500">
            <span className="mr-4">共{episodes}集</span>
            <span>{publisher}</span>
          </div>
        </div>

        {/* 收藏按钮 */}
        <button
          onClick={() => setIsCollected(!isCollected)} // 点击切换收藏状态
          className={`flex items-center text-sm px-2 py-1 rounded-lg transition-colors ${
            isCollected
              ? "bg-red-100 text-red-600 hover:bg-red-200" // 已收藏状态样式
              : "bg-gray-100 text-gray-600 hover:bg-gray-200" // 未收藏状态样式
          }`}
        >
          {/* 收藏图标 */}
          <svg
            className="w-4 h-4 mr-1"
            fill={isCollected ? "currentColor" : "none"} // 动态填充状态
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          收藏
        </button>
      </div>

      {/* 分割线 */}
      <div className="border-t border-gray-100 mb-2"></div>

      {/* 节目描述 */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
          {description}
        </p>
      </div>

      {/* 操作按钮组 */}
      {/*<div className="flex text-sm space-x-1">*/}
      {/*    /!* 播放最新节目按钮 *!/*/}
      {/*    <button className="flex-1 bg-blue-600 text-white py-1 px-1 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">*/}
      {/*        <svg*/}
      {/*            className="w-6 h-6 mr-2"*/}
      {/*            fill="none"*/}
      {/*            stroke="currentColor"*/}
      {/*            viewBox="0 0 24 24"*/}
      {/*        >*/}
      {/*            <path*/}
      {/*                strokeLinecap="round"*/}
      {/*                strokeLinejoin="round"*/}
      {/*                strokeWidth={2}*/}
      {/*                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"*/}
      {/*            />*/}
      {/*            <path*/}
      {/*                strokeLinecap="round"*/}
      {/*                strokeLinejoin="round"*/}
      {/*                strokeWidth={2}*/}
      {/*                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"*/}
      {/*            />*/}
      {/*        </svg>*/}
      {/*        播放最新节目*/}
      {/*    </button>*/}

      {/*    /!* 添加到播放列表按钮 *!/*/}
      {/*    <button className="flex-1 bg-gray-100 text-gray-600 py-1 px-1 rounded-lg hover:bg-gray-200 transition-colors">*/}
      {/*        添加到播放列表*/}
      {/*    </button>*/}
      {/*</div>*/}
    </div>
  );
}
