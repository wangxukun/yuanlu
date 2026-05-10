"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Bookmark,
  Share2,
  Calendar,
  Clock,
  Tv,
  Mic,
  Download,
  FileDown,
  Loader2,
} from "lucide-react";
import { Episode } from "@/core/episode/episode.entity";
import { useSession } from "next-auth/react";
import { usePlayerStore } from "@/store/player-store";
import Link from "next/link";
import { toggleEpisodeFavorite } from "@/lib/actions/favorite-actions";
import { toast } from "sonner";
import { formatChineseDate } from "@/lib/tools";

export default function EpisodeSummarize({ episode }: { episode: Episode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const {
    play,
    togglePlay,
    isPlaying,
    currentEpisode,
    setCurrentEpisode,
    setCurrentAudioUrl,
    setPlaylist,
  } = usePlayerStore();

  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const isCurrentEpisode = currentEpisode?.episodeid === episode.episodeid;
  const isPlayingThis = isCurrentEpisode && isPlaying;

  const router = useRouter();
  const safeId = episode.episodeid;

  // 1. 初始化检查收藏状态
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (session?.user?.userid && episode.episodeid) {
        try {
          const response = await fetch(
            `/api/episode/favorite/find-unique?episodeid=${episode.episodeid}&userid=${session.user.userid}`,
            { method: "GET" },
          );
          const data = await response.json();
          if (data.success) {
            setIsFavorited(true);
          }
        } catch (error) {
          console.error("Failed to check episode favorite status", error);
        }
      }
    };
    checkFavoriteStatus();
  }, [session, episode.episodeid]);

  // 2. 处理收藏/取消收藏 (乐观更新)
  const handleToggleFavorite = async (e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (!session?.user) {
      toast.error("请先登录后收藏");
      return;
    }

    if (isLoadingFavorite) return;
    setIsLoadingFavorite(true);

    const prevIsFavorited = isFavorited;
    setIsFavorited(!prevIsFavorited);

    try {
      const result = await toggleEpisodeFavorite(episode.episodeid, pathname);

      if (!result.success) {
        setIsFavorited(prevIsFavorited);
        toast.error(result.message || "操作失败");
      } else {
        toast.success(result.isFavorited ? "收藏成功" : "已取消收藏");
      }
    } catch (error) {
      console.error(error);
      setIsFavorited(prevIsFavorited);
      toast.error("网络错误，请重试");
    } finally {
      setIsLoadingFavorite(false);
    }
  };

  const handleDownloadAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!episode.episodeid) {
      toast.error("单集信息不完整");
      return;
    }

    try {
      toast.info("准备下载中...");

      // 请求后端生成合法的带附件头签名下载链接 (解决 OSS 签名不匹配问题)
      const res = await fetch(
        `/api/episode/download?episodeid=${episode.episodeid}`,
      );
      const data = await res.json();

      if (!data.success || !data.downloadUrl) {
        throw new Error(data.error || "获取下载链接失败");
      }

      // 使用带下载属性的链接或直接打开（由于后端已设置 attachment，浏览器会自动触发下载）
      const a = document.createElement("a");
      a.href = data.downloadUrl;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("开始下载");
    } catch (error: unknown) {
      console.error("Download failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "下载启动失败，请稍后重试";
      toast.error(errorMessage);
    }
  };

  const handleDownloadTranscript = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!episode.episodeid) {
        toast.error("单集信息不完整");
        return;
      }
      if (isGeneratingPdf) return;

      setIsGeneratingPdf(true);
      toast.info("正在生成文稿 PDF，请稍候...");

      try {
        const res = await fetch(
          `/api/episode/transcript-pdf?episodeid=${episode.episodeid}`,
        );

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(errorData?.error || "文稿生成失败");
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${episode.title || "文稿"} - Transcript.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("文稿已下载");
      } catch (error: unknown) {
        console.error("Transcript PDF download failed:", error);
        const errorMessage =
          error instanceof Error ? error.message : "文稿下载失败，请稍后重试";
        toast.error(errorMessage);
      } finally {
        setIsGeneratingPdf(false);
      }
    },
    [episode.episodeid, episode.title, isGeneratingPdf],
  );

  const handleFeatureUnderDev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    toast.info("功能开发中...");
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCurrentEpisode) {
      togglePlay();
    } else {
      setCurrentEpisode(episode);
      setCurrentAudioUrl(episode.audioUrl);
      if (episode.podcast?.episode) {
        const enrichedEpisodes = (episode.podcast.episode as Episode[]).map(
          (ep) => ({
            ...ep,
            podcast: ep.podcast || { title: episode.podcast?.title },
          }),
        );
        setPlaylist(enrichedEpisodes);
      } else {
        setPlaylist([episode]);
      }
      play();
    }
  };

  const handleStartPractice = () => {
    if (!safeId) return;
    router.push(`/episode/${safeId}/practice`);
  };

  return (
    <section className="flex flex-col gap-8">
      {/* --- Main Player / Cover Area --- */}
      <div className="w-full">
        <div className="group relative w-full aspect-[16/9] md:aspect-[16/9] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
          <img
            src={episode.coverUrl}
            alt={episode.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
          {/* Play Overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            onClick={handlePlay}
          >
            <button className="bg-[#5830E0] text-white p-5 rounded-full shadow-2xl transform transition-transform hover:scale-110">
              {isPlayingThis ? (
                <Pause className="w-10 h-10 fill-current" />
              ) : (
                <Play className="w-10 h-10 ml-1 fill-current" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* --- Content Details --- */}
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-col gap-2">
          {/* Badges & Meta */}
          <div className="flex flex-wrap gap-4 items-center">
            {episode.tags && episode.tags.length > 0 && (
              <span className="bg-[#5830E0]/5 text-[#5830E0] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {episode.tags[0].name}
              </span>
            )}
            <span className="text-sm text-slate-500 flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4" />
              {episode.publishAt
                ? formatChineseDate(episode.publishAt)
                : "未知日期"}
            </span>
            <span className="text-sm text-slate-500 flex items-center gap-1.5 font-medium">
              <Clock className="w-4 h-4" />
              {typeof episode.duration === "number"
                ? `${Math.floor(episode.duration / 60)}分钟`
                : episode.duration}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-50 leading-tight">
            {episode.title}
          </h1>

          {/* Podcast Title */}
          <Link
            href={`/podcast/${episode.podcastid}`}
            className="text-[#5830E0] font-bold text-lg hover:underline transition-all flex items-center gap-2"
          >
            <Tv className="w-5 h-5" />
            {episode.podcast?.title || "远路英语"}
          </Link>
        </div>

        {/* Action Row */}
        <div className="flex flex-wrap items-center gap-4 py-2 border-y border-slate-100 dark:border-slate-800">
          {/* Practice & Download Group */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartPractice}
              className="bg-[#5830E0] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold hover:bg-[#470fd0] transition-colors"
            >
              <Mic className="w-5 h-5" />
              <span>口语练习</span>
            </button>

            <button
              onClick={handleDownloadAudio}
              className="p-2.5 text-slate-500 hover:text-[#5830E0] hover:bg-[#5830E0]/5 rounded-xl transition-all border border-slate-100 dark:border-slate-800"
              title="下载音频"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownloadTranscript}
              disabled={isGeneratingPdf}
              className="p-2.5 text-slate-500 hover:text-[#5830E0] hover:bg-[#5830E0]/5 rounded-xl transition-all border border-slate-100 dark:border-slate-800 disabled:opacity-50 disabled:cursor-wait"
              title="下载文稿 PDF"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileDown className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block mx-2" />

          {/* Play, Share, Bookmark */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlay}
              className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 hover:text-[#5830E0] transition-colors"
            >
              <div className="bg-[#5830E0] text-white p-2 rounded-full">
                {isPlayingThis ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </div>
              <span>{isPlayingThis ? "暂停" : "播放"}</span>
            </button>

            <button
              onClick={handleToggleFavorite}
              className={`flex items-center gap-1.5 font-medium transition-colors ${
                isFavorited
                  ? "text-[#5830E0]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Bookmark
                className={`w-5 h-5 ${isFavorited ? "fill-current" : ""}`}
              />
              <span className="hidden sm:inline">收藏</span>
            </button>

            <button
              onClick={handleFeatureUnderDev}
              className="flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              <Share2 className="w-5 h-5" />
              <span className="hidden sm:inline">分享</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
