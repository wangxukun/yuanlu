"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { usePlayerStore } from "@/store/player-store";
import { Episode } from "@/app/types/podcast";

// 更新后的Mock数据
const mockEpisode: Episode = {
  id: "1",
  title: "Rage bait: How online anger makes money",
  date: "2025-02-13",
  duration: "6分钟",
  imageUrl: "/static/images/240104.jpg",
  isExclusive: false,
  publisher: "BBC Learning English",
  category: "商业心理", // 新增分类数据
  description:
    "本集讨论了网络愤怒如何被用来赚钱。通过分析社交媒体上的愤怒内容，我们探讨了这种现象背后的心理学和经济学原理。",
  transcript: [
    {
      time: "[00:00]",
      en: "Welcome to 6 Minute English from BBC Learning English.",
      cn: "欢迎收听BBC英语学习的《六分钟英语》。",
    },
    {
      time: "[00:05]",
      en: "I'm Neil, and joining me today is Dan.",
      cn: "我是尼尔，今天和我一起的是丹。",
    },
    {
      time: "[00:08]",
      en: "Hi Dan! Today we're talking about rage bait.",
      cn: "嗨，丹！今天我们要讨论愤怒诱饵。",
    },
    {
      time: "[00:12]",
      en: "Rage bait is online content designed to make people angry.",
      cn: "愤怒诱饵是专门设计来激怒人们的网络内容。",
    },
    {
      time: "[00:17]",
      en: "It's a strategy used to generate clicks and revenue.",
      cn: "这是一种用于获取点击和收入的策略。",
    },
    {
      time: "[00:21]",
      en: "But why does it work so well? Let's find out.",
      cn: "但为什么它如此有效？让我们一探究竟。",
    },
  ],
};

export default function EpisodePage() {
  const searchParams = useSearchParams(); // 使用 useSearchParams() 访问 URL 参数
  const initialCollected = searchParams.get("collected") === "true";

  const [showTranslation, setShowTranslation] = useState(false);
  // 状态管理：收藏状态
  const [isCollected, setIsCollected] = useState(initialCollected);

  const { isPlaying, setEpisode, togglePlay } = usePlayerStore();

  return (
    <div className="rounded-xl shadow-md p-6 mt-4 max-w-6xl mx-auto">
      {/* 第一行：单集信息 */}
      <div className="flex items-start space-x-6 mb-8">
        {/* 修改为16:9比例的图片容器 */}
        <div className="relative w-48 aspect-video rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={mockEpisode.imageUrl}
            alt={mockEpisode.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>

        {/* 单集详细信息 */}
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-800 mb-2">
            {mockEpisode.title}
          </h1>

          {/* 新增分类标签 */}
          <div className="flex items-center space-x-2 mb-1">
            <p className="text-sm text-gray-500">{mockEpisode.publisher}</p>
            <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
              {mockEpisode.category}
            </span>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            {mockEpisode.date} · {mockEpisode.duration}
          </p>

          {/* 操作按钮组 */}
          <div className="flex items-center space-x-4">
            {/* 收藏按钮 */}
            <button
              onClick={() => setIsCollected(!isCollected)} // 点击切换收藏状态
              className={`flex items-center text-xs px-2 py-1 rounded-lg transition-colors ${
                isCollected
                  ? "bg-red-100 text-red-600 hover:bg-red-200" // 已收藏状态样式
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200" // 未收藏状态样式
              }`}
            >
              {/* 收藏图标 */}
              <svg
                className="w-5 h-5 mr-2"
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

            {/* 文档下载链接 */}
            <a
              href="#"
              className="flex items-center px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              下载文稿
            </a>

            <button
              onClick={() => {
                setEpisode(mockEpisode);
                togglePlay();
              }}
              className="flex items-center px-4 py-1 bg-slate-200 text-xs text-gray-500 rounded-lg hover:bg-slate-300 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                {isPlaying ? (
                  // 暂停图标
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                ) : (
                  // 播放图标
                  <path
                    fillRule="evenodd"
                    d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                    clipRule="evenodd"
                  />
                )}
              </svg>
              {isPlaying ? "暂停" : "播放"}
            </button>
          </div>
        </div>
      </div>

      {/* 第二行：单集简介 */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-500 mb-4">单集简介</h2>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
          {mockEpisode.description}
        </p>
      </div>

      {/* 第三行：单集文稿 */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-500">单集文稿</h2>
          {/* 新增翻译切换按钮 */}
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className="flex items-center space-x-2 px-4 py-1 text-xs text-slate-500 font-bold bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h3M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
              />
            </svg>
            <span>{showTranslation ? "隐藏翻译" : "显示翻译"}</span>
          </button>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="text-sm space-y-4 font-sans">
            {mockEpisode.transcript.map((line, index) => (
              <div key={index}>
                <p className="text-stone-500">
                  {line.time} {line.en}
                </p>
                {showTranslation && (
                  <p className="text-slate-500 mt-1 ml-4">{line.cn}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
