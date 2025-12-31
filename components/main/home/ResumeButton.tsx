"use client";

import React from "react";
import { ArrowPathIcon, PlayCircleIcon } from "@heroicons/react/24/solid";
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
  isFinished?: boolean;
}

interface ResumeButtonProps {
  latestHistory: ResumeData | null;
}

const ResumeButton: React.FC<ResumeButtonProps> = ({ latestHistory }) => {
  // [修改] 获取当前播放的剧集信息，用于对比
  const { setAudio, setIsPlaying, currentEpisode, isPlaying, currentTime } =
    usePlayerStore();

  const handleResume = () => {
    if (!latestHistory) {
      return;
    }

    // 判断是否已完成
    const isFinished = latestHistory.isFinished;

    // [新增] 检查当前是否已经在播放同一首音频
    const isSameEpisode = currentEpisode?.episodeid === latestHistory.episodeId;

    if (isSameEpisode) {
      // 如果是同一首，且已经在播放，提示即可
      if (isPlaying) {
        toast.info("当前正在播放中");
        return;
      }
      // 如果是同一首但暂停了，只恢复播放，不重置进度
      // 如果已完成且是同一首，想重听，通常用户会拖进度条。
      // 但如果点击这个大按钮，建议行为是：如果已播完，重置到开头；如果没有，继续播放。
      if (
        isFinished &&
        currentTime &&
        currentEpisode?.duration &&
        currentTime >= currentEpisode.duration - 5
      ) {
        // 如果确实快放完了，重置
        // setAudio({ ...currentEpisode, initialTime: 0 } as any); // 注意：这里可能需要构造 AudioTrack 类型
        setAudio({
          id: currentEpisode.episodeid,
          src: currentEpisode.audioUrl,
          title: currentEpisode.title,
          author: latestHistory.author,
          coverUrl: currentEpisode.coverUrl,
          duration: currentEpisode.duration,
          initialTime: 0,
        });
        toast.success("重新播放");
      } else {
        setIsPlaying(true);
        toast.success("继续播放");
      }
      return;
    }

    // 如果已完成，初始时间设为 0；否则使用记录的进度
    const startSeconds = isFinished ? 0 : latestHistory.progressSeconds;

    // 如果不是同一首，则切歌并设置初始时间
    setAudio({
      id: latestHistory.episodeId,
      src: latestHistory.audioUrl,
      title: latestHistory.title,
      author: latestHistory.author,
      coverUrl: latestHistory.coverUrl,
      duration: latestHistory.duration,
      initialTime: startSeconds,
    });

    setIsPlaying(true);
    // 提示语区分
    if (isFinished) {
      toast.success(`重新播放: ${latestHistory.title}`);
    } else {
      toast.success(`继续播放: ${latestHistory.title}`);
    }
  };

  if (!latestHistory) {
    return (
      <button className="bg-white text-indigo-600 px-6 py-2.5 rounded-full font-semibold hover:bg-indigo-50 transition-colors inline-flex items-center shadow-md border-none opacity-50 cursor-not-allowed">
        <PlayCircleIcon className="w-5 h-5 mr-2" />
        暂无进度
      </button>
    );
  }

  // 格式化时间显示
  const mins = Math.floor(latestHistory.progressSeconds / 60);
  const secs = latestHistory.progressSeconds % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;

  // 根据状态决定文案和图标
  if (latestHistory.isFinished) {
    return (
      <button
        onClick={handleResume}
        className="bg-white text-indigo-600 px-6 py-2.5 rounded-full font-semibold hover:bg-indigo-50 transition-colors inline-flex items-center shadow-md border-none cursor-pointer"
      >
        <ArrowPathIcon className="w-5 h-5 mr-2" />

        <span className="text-sm sm:text-base">再听一遍</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleResume}
      className="bg-white text-indigo-600 px-6 py-2.5 rounded-full font-semibold hover:bg-indigo-50 transition-colors inline-flex items-center shadow-md border-none cursor-pointer"
    >
      <PlayCircleIcon className="w-5 h-5 mr-2" />
      <span className="text-sm sm:text-base">继续学习</span>
      <span className="hidden sm:inline">({timeStr})</span>
    </button>
  );
};

export default ResumeButton;
