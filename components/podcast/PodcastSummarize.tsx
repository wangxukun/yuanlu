"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { PauseIcon, PlayIcon } from "@heroicons/react/24/solid";
import { usePlayerStore } from "@/store/player-store";
import { Podcast } from "@/app/types/podcast";
import { PodcastFavoriteBtn } from "@/components/FavoriteBtn";

export default function PodcastSummarize({ podcast }: { podcast: Podcast }) {
  const { data: session } = useSession();

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

  // 获取最后一个episode
  const lastEpisode = podcast.episode.sort((a, b) => {
    return new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime();
  })[0];

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
    if (audioRef) {
      // 如果当前音频已经是目标音频，则直接播放或暂停
      if (currentEpisode?.episodeid === lastEpisode?.episodeid) {
        if (isPlaying) {
          pause();
        } else {
          play();
        }
      } else {
        // 否则，设置新的音频 URL 并播放
        setCurrentAudioUrl(lastEpisode.audioUrl);
        setCurrentEpisode(lastEpisode);
        setDuration(lastEpisode.duration);
      }
    }
  };

  // const handleCollected = () => {
  //   setIsCollected(!isCollected);
  // };

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
            {podcast.platform}
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
          {session?.user && (
            <PodcastFavoriteBtn
              podcastid={podcast.podcastid}
              userid={session.user.userid}
            />
          )}
        </div>
      </div>
    </div>
  );
}
