"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PauseIcon, PlayIcon } from "@heroicons/react/24/solid";
import { usePlayerStore } from "@/store/player-store";
import { Podcast } from "@/app/types/podcast";

export default function ProgramSummarize({ podcast }: { podcast: Podcast }) {
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
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const play = usePlayerStore((state) => state.play);
  const pause = usePlayerStore((state) => state.pause);

  // 获取最后一个episode
  const lastEpisode = podcast.episode.sort((a, b) => {
    return new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime();
  })[0];

  useEffect(() => {
    if (audioRef) {
      console.log("可以控制 Header 中的 audio：", audioRef);
      // 示例操作：audioRef.play();
    }
  }, [audioRef]);

  // 当 currentAudioUrl 发生变化时，更新音频源并播放
  useEffect(() => {
    if (currentAudioUrl && audioRef && audioRef.src !== currentAudioUrl) {
      const audioElement = audioRef;
      try {
        // 暂停当前音频
        audioElement.pause();
        // 设置新的音频源
        audioElement.src = currentAudioUrl;
        // 加载新的音频资源
        audioElement.load();
        // 播放新的音频
        audioElement.play().catch((error) => {
          console.error("Audio playback failed:", error);
        });
      } catch (error) {
        console.error("Error while switching audio source:", error);
      }
    }
  }, [currentAudioUrl]);

  const handlePlay = () => {
    const audioUrl = lastEpisode.audioUrl;
    console.log("audioRef: ", audioRef);
    console.log("currentAudioUrl: ", currentAudioUrl);
    console.log("audioUrl: ", audioUrl);
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
        setCurrentEpisode(lastEpisode);
        setDuration(lastEpisode.duration);
        setIsPlaying(true);
      }
    }
  };

  return (
    // 最外层容器
    <div className="flex flex-row p-6">
      {/* 图片展示区域 */}
      <div className="flex max-w-72 h-72 mb-4 rounded-lg overflow-hidden">
        <Image
          src={podcast.coverUrl} // 图片地址
          alt={podcast.title} // 图片替代文本
          width={300}
          height={300}
          className="object-cover" // 图片裁剪方式
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" // 响应式图片尺寸
        />
      </div>
      {/* 标题和操作区 */}
      <div className="flex-row max-w-xl p-6 items-start justify-between mb-4">
        <div className="">
          {/* 节目标题 */}
          <h1 className="text-2xl font-bold text-gray-800">{podcast.title}</h1>
          <Link
            href="#"
            className="text-xl font-bold text-purple-700 hover:underline"
          >
            {podcast.from}
          </Link>
          {/* 节目信息（集数和发布者） */}
          <div className="text-sm text-gray-500">
            <div className="pt-2 pb-10">共{podcast.episode.length}集</div>
          </div>
        </div>
        {/* 节目描述 */}
        <div className="mb-4">
          <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">
            {podcast.description}
          </p>
        </div>
        <div className="flex text-sm space-x-1 justify-between">
          {/* 播放最新节目按钮 */}
          <button
            className="sm:bg-purple-700 sm:w-[120px] h-7 text-white flex items-center justify-center space-x-2 px-4 py-2 hover:drop-shadow-md rounded-lg transition-colors"
            onClick={handlePlay}
          >
            {isPlaying &&
            currentEpisode &&
            currentEpisode.episodeid === lastEpisode.episodeid ? (
              <PauseIcon className="h-4 w-4 text-white" />
            ) : (
              <PlayIcon className="h-4 w-4 text-white" />
            )}

            {currentEpisode === null ||
            currentEpisode.episodeid !== lastEpisode.episodeid
              ? "播放最新集"
              : isPlaying
                ? "暂停"
                : "恢复"}
          </button>
          {/*操作按钮组*/}
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
      </div>
    </div>
  );
}
