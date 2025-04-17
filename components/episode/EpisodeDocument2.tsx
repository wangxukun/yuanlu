"use client";

import { useState } from "react";
import { Episode } from "@/app/types/podcast";
// 更新后的Mock数据
const mockEpisode = {
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
export default function EpisodeDocument({ episode }: { episode: Episode }) {
  const [showTranslation, setShowTranslation] = useState(false);

  return (
    <div className="flex flex-col w-full max-w-[1200px] justify-start">
      <div className="flex flex-row  w-full justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-slate-500">单集文稿</h2>
        <p>{episode.subtitleEnUrl}</p>
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
  );
}
