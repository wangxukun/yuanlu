"use client";

import React from "react";
import { PlayCircleIcon } from "@heroicons/react/24/solid";
import { usePlayerStore } from "@/store/player-store";
import { toast } from "sonner";

export interface ResumeData {
  episodeId: string;
  title: string;
  author: string;
  audioUrl: string;
  coverUrl: string;
  progressSeconds: number;
  duration: number;
}

interface ResumeButtonProps {
  latestHistory: ResumeData | null;
}

const ResumeButton: React.FC<ResumeButtonProps> = ({ latestHistory }) => {
  // [修改] 获取当前播放的剧集信息，用于对比
  const { setAudio, setIsPlaying, currentEpisode, isPlaying } =
    usePlayerStore();

  const handleResume = () => {
    if (!latestHistory) {
      return;
    }

    // [新增] 检查当前是否已经在播放同一首音频
    const isSameEpisode = currentEpisode?.episodeid === latestHistory.episodeId;

    if (isSameEpisode) {
      // 如果是同一首，且已经在播放，提示即可
      if (isPlaying) {
        toast.info("当前正在播放中");
        return;
      }
      // 如果是同一首但暂停了，只恢复播放，不重置进度
      setIsPlaying(true);
      toast.success("继续播放");
      return;
    }

    // 如果不是同一首，则切歌并设置初始时间
    setAudio({
      id: latestHistory.episodeId,
      src: latestHistory.audioUrl,
      title: latestHistory.title,
      author: latestHistory.author,
      coverUrl: latestHistory.coverUrl,
      duration: latestHistory.duration,
      initialTime: latestHistory.progressSeconds,
    });

    setIsPlaying(true);
    toast.success(`开始播放: ${latestHistory.title}`);
  };

  if (!latestHistory) {
    return (
      <button className="bg-white text-indigo-600 px-6 py-2.5 rounded-full font-semibold hover:bg-indigo-50 transition-colors inline-flex items-center shadow-md border-none opacity-50 cursor-not-allowed">
        <PlayCircleIcon className="w-5 h-5 mr-2" />
        暂无进度
      </button>
    );
  }

  const mins = Math.floor(latestHistory.progressSeconds / 60);
  const secs = latestHistory.progressSeconds % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <button
      onClick={handleResume}
      className="bg-white text-indigo-600 px-6 py-2.5 rounded-full font-semibold hover:bg-indigo-50 transition-colors inline-flex items-center shadow-md border-none cursor-pointer"
    >
      <PlayCircleIcon className="w-5 h-5 mr-2" />
      继续学习 ({timeStr})
    </button>
  );
};

export default ResumeButton;
