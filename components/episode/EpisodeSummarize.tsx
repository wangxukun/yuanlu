"use client";

import Image from "next/image";
import { Episode } from "@/app/types/podcast";
import { formatTime } from "@/app/lib/tools";
import { useEffect, useState } from "react";
import { usePlayerStore } from "@/store/player-store";
import { PauseIcon, PlayIcon } from "@heroicons/react/24/solid";

export default function EpisodeSummarize({ episode }: { episode: Episode }) {
  // 状态管理：收藏状态
  const [isCollected, setIsCollected] = useState(false);
  const audioRef = usePlayerStore((state) => state.audioRef);
  const currentEpisode = usePlayerStore((state) => state.currentEpisode);
  const setCurrentEpisode = usePlayerStore((state) => state.setCurrentEpisode);
  const currentAudioUrl = usePlayerStore((state) => state.currentAudioUrl);
  const setCurrentAudioUrl = usePlayerStore(
    (state) => state.setCurrentAudioUrl,
  );
  const setDuration = usePlayerStore((state) => state.setDuration);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const play = usePlayerStore((state) => state.play);
  const pause = usePlayerStore((state) => state.pause);

  // 当 currentAudioUrl 发生变化时，更新音频源并播放
  useEffect(() => {
    if (currentAudioUrl && audioRef && audioRef.src !== currentAudioUrl) {
      const audioElement = audioRef;
      try {
        console.log("currentAudioUrl值改变，重头开始播放");
        // 暂停当前音频
        pause();
        // 设置新的音频源
        audioElement.src = currentAudioUrl;
        // 加载新的音频资源
        audioElement.load();
        // 播放新的音频
        play();
      } catch (error) {
        console.error("Error while switching audio source:", error);
      }
    }
  }, [currentAudioUrl]);

  const handlePlay = () => {
    const audioUrl = episode.audioUrl;
    if (audioRef) {
      // 如果当前音频 URL 已经是目标音频，则直接播放或暂停
      if (currentAudioUrl === audioUrl) {
        if (isPlaying) {
          pause();
        } else {
          play();
        }
      } else {
        // 否则，设置新的音频 URL 并播放
        setCurrentAudioUrl(audioUrl);
        setCurrentEpisode(episode);
        setDuration(episode.duration);
      }
    }
  };

  return (
    <div className="flex flex-col justify-start w-full max-w-[1200px]">
      <div className="flex items-center space-x-6 mb-8">
        {/* 修改为16:9比例的图片容器 */}
        <div className="relative w-48 aspect-square rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={episode.coverUrl}
            alt={episode.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>

        {/* 单集详细信息 */}
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-800 mb-4">
            {episode.title}
          </h1>

          {/* 新增分类标签 */}
          <div className="flex items-center space-x-2 mb-4">
            <p className="text-sm text-gray-500">{episode.category.from}</p>
            <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
              {episode.category.title}
            </span>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            发布日期：{episode.publishAt.split("T")[0]}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            剧集时长：{formatTime(episode.duration)}
          </p>

          <div className="flex text-sm space-x-1 justify-start">
            {/* 播放节目按钮 */}
            <button
              className="sm:bg-purple-700 sm:w-[80px] h-7 text-white flex items-center justify-center space-x-2 px-4 py-2 hover:drop-shadow-md rounded-lg transition-colors"
              onClick={handlePlay}
            >
              {isPlaying &&
              currentEpisode &&
              currentEpisode.episodeid === episode.episodeid ? (
                <PauseIcon className="h-4 w-4 text-white" />
              ) : (
                <PlayIcon className="h-4 w-4 text-white" />
              )}

              {currentEpisode === null ||
              currentEpisode.episodeid !== episode.episodeid
                ? "播放"
                : isPlaying
                  ? "暂停"
                  : "恢复"}
            </button>
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
          </div>
        </div>
      </div>

      {/* 第二行：单集简介 */}
      <div className="flex flex-col">
        <h2 className="text-lg font-bold text-slate-500 mb-4">剧集简介</h2>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
          {episode.description}
        </p>
      </div>
    </div>
  );
}
