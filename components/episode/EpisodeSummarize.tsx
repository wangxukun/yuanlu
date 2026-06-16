"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Lock,
  Bookmark,
  Share2,
  Calendar,
  Clock,
  Tv,
  Mic,
  Download,
  FileDown,
  Loader2,
  Headphones,
  Languages,
  X,
  Sparkles,
  Crown,
} from "lucide-react";
import { Episode } from "@/core/episode/episode.entity";
import { useSession } from "next-auth/react";
import { usePlayerStore } from "@/store/player-store";
import { checkExclusivePlay } from "@/lib/client/auth-utils";
import Link from "next/link";
import { toggleEpisodeFavorite } from "@/lib/actions/favorite-actions";
import { toast } from "sonner";
import { formatChineseDate } from "@/lib/tools";
import { useUIStore } from "@/store/ui-store";

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
  const [isTranslatingTitle, setIsTranslatingTitle] = useState(false);
  const [translatedTitle, setTranslatedTitle] = useState("");
  const [isTranscriptPreviewOpen, setIsTranscriptPreviewOpen] = useState(false);
  const [transcriptPreview, setTranscriptPreview] = useState<{
    podcastTitle: string;
    episodeTitle: string;
    coverUrl?: string;
    subtitles: { textEn: string; textZh: string }[];
    totalSubtitles: number;
  } | null>(null);

  const handleTranslateTitle = async () => {
    if (translatedTitle) {
      setTranslatedTitle("");
      return;
    }
    try {
      setIsTranslatingTitle(true);
      const res = await fetch("/api/dictionary/youdao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: episode.title }),
      });
      const data = await res.json();
      if (res.ok && data.definition) {
        setTranslatedTitle(data.definition);
      } else {
        if (!session?.user) {
          (
            document.getElementById(
              "email_check_modal_box",
            ) as HTMLDialogElement
          )?.showModal();
        } else {
          toast.error("翻译失败，请稍后重试");
        }
      }
    } catch {
      if (!session?.user) {
        (
          document.getElementById("email_check_modal_box") as HTMLDialogElement
        )?.showModal();
      } else {
        toast.error("翻译请求出错");
      }
    } finally {
      setIsTranslatingTitle(false);
    }
  };

  const isCurrentEpisode = currentEpisode?.episodeid === episode.episodeid;
  const isPlayingThis = isCurrentEpisode && isPlaying;

  const isLocked =
    episode.isExclusive &&
    (!session?.user ||
      (session.user.role !== "PREMIUM" && session.user.role !== "ADMIN"));

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

    if (!session?.user) {
      toast.error("音频下载仅对会员开放");
      return;
    }

    if (session.user.role !== "PREMIUM" && session.user.role !== "ADMIN") {
      useUIStore.getState().openPremiumModal();
      return;
    }

    try {
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

      if (!session?.user) {
        toast.error("文稿下载仅对会员开放");
        return;
      }

      if (session.user.role !== "PREMIUM" && session.user.role !== "ADMIN") {
        // Fetch real transcript preview data (max 4 subtitle pairs) from dedicated preview API
        try {
          const res = await fetch(
            `/api/episode/transcript-preview?episodeid=${episode.episodeid}`,
          );
          const json = await res.json();
          if (json.success && json.data) {
            setTranscriptPreview(json.data);
          }
        } catch {
          // Silently proceed with null preview
        }
        setIsTranscriptPreviewOpen(true);
        return;
      }

      if (isGeneratingPdf) return;

      setIsGeneratingPdf(true);
      toast.info("正在生成文稿 PDF，请稍候...");

      try {
        const format = window.innerWidth < 768 ? "A5" : "A4";
        const res = await fetch(
          `/api/episode/transcript-pdf?episodeid=${episode.episodeid}&format=${format}`,
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
    [episode.episodeid, episode.title, isGeneratingPdf, session],
  );

  const handleShare = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const shareUrl = `${window.location.origin}/episode/${episode.episodeid}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("播客剧集链接地址已复制");
    } catch {
      toast.error("复制链接失败");
    }
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!checkExclusivePlay(episode, session)) return;
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

    if (episode.isExclusive) {
      if (!session?.user) {
        toast.error("PRO剧集语音评测仅对会员开放");
        return;
      }
      if (session.user.role !== "PREMIUM" && session.user.role !== "ADMIN") {
        useUIStore.getState().openPremiumModal();
        return;
      }
      router.push(`/episode/${safeId}/practice`);
    } else {
      if (!session?.user) {
        (
          document.getElementById("email_check_modal_box") as HTMLDialogElement
        )?.showModal();
        return;
      }
      router.push(`/episode/${safeId}/practice`);
    }
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

          {/* PRO and Play count badges (top left) */}
          <div className="absolute top-3 left-3 md:top-4 md:left-4 z-10 flex gap-1.5 items-center">
            {episode.isExclusive && (
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-1 rounded shadow-sm font-extrabold text-xs tracking-widest flex items-center">
                👑 PRO
              </div>
            )}
            {episode.playCount !== undefined && (
              <div className="bg-[rgba(20,20,30,0.8)] text-white backdrop-blur-md px-2 py-1 rounded shadow-sm text-xs font-medium flex items-center tracking-wide">
                <Headphones className="w-3.5 h-3.5 mr-1.5 opacity-80" />
                {episode.playCount.toLocaleString()}
              </div>
            )}
          </div>

          {/* Difficulty badge (top right) */}
          {episode.difficulty && (
            <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10">
              <div
                className={`bg-white/95 px-2.5 py-1 rounded shadow-sm font-extrabold text-sm tracking-wide ${
                  episode.difficulty.includes("A")
                    ? "text-emerald-600"
                    : episode.difficulty.includes("B1")
                      ? "text-blue-600"
                      : episode.difficulty.includes("B2")
                        ? "text-purple-600"
                        : episode.difficulty.includes("C")
                          ? "text-rose-600"
                          : "text-gray-700"
                }`}
              >
                {episode.difficulty}
              </div>
            </div>
          )}

          {/* Play Overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            onClick={handlePlay}
          >
            <button className="bg-[#5830E0] text-white p-5 rounded-full shadow-2xl transform transition-transform hover:scale-110">
              {isPlayingThis ? (
                <Pause className="w-10 h-10 fill-current" />
              ) : isLocked ? (
                <Lock className="w-10 h-10" />
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
          <div className="flex items-start justify-between gap-4 group/title">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-50 leading-tight">
              {episode.title}
              {translatedTitle && (
                <span className="block text-lg font-medium text-slate-600 dark:text-slate-300 mt-2">
                  {translatedTitle}
                </span>
              )}
            </h1>
            <button
              onClick={handleTranslateTitle}
              disabled={isTranslatingTitle}
              className={`p-2 rounded-xl transition-all shrink-0 ${
                translatedTitle
                  ? "bg-[#5830E0]/10 text-[#5830E0]"
                  : "text-slate-400 hover:text-[#5830E0] hover:bg-[#5830E0]/5 md:opacity-0 md:group-hover/title:opacity-100"
              }`}
              title="翻译"
            >
              {isTranslatingTitle ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Languages className="w-5 h-5" />
              )}
            </button>
          </div>

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
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-2 border-y border-slate-100 dark:border-slate-800">
          {/* Row 1: Play & Practice (Full display on mobile, left portion on desktop) */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Play/Pause Button */}
            <button
              onClick={handlePlay}
              className="btn btn-primary px-6 py-2.5 min-h-0 h-auto rounded-xl flex items-center gap-2 font-bold transition-colors border-none text-white flex-1 sm:flex-none justify-center sm:justify-start"
            >
              {isPlayingThis ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : isLocked ? (
                <Lock className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
              <span>{isPlayingThis ? "暂停" : "播放"}</span>
            </button>

            {/* Practice Button */}
            <button
              onClick={handleStartPractice}
              className="btn btn-secondary px-6 py-2.5 min-h-0 h-auto rounded-xl flex items-center gap-2 font-bold transition-colors border-none text-white flex-1 sm:flex-none justify-center sm:justify-start"
            >
              {isLocked ? (
                <Lock className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
              <span>语音评测</span>
            </button>
          </div>

          {/* Row 2: Audio/Transcript Download, Favorite, Share (Icons only on mobile, full display on desktop) */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            {/* Audio Download */}
            <button
              onClick={handleDownloadAudio}
              className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 sm:border-none flex items-center gap-1.5 font-medium transition-colors justify-center flex-1 sm:flex-none text-slate-500 hover:text-[#5830E0] hover:bg-[#5830E0]/5 sm:hover:bg-transparent"
              title="下载音频"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">音频</span>
            </button>

            {/* Transcript Download */}
            <button
              onClick={handleDownloadTranscript}
              disabled={isGeneratingPdf}
              className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 sm:border-none flex items-center gap-1.5 font-medium transition-colors justify-center flex-1 sm:flex-none text-slate-500 hover:text-[#5830E0] hover:bg-[#5830E0]/5 sm:hover:bg-transparent disabled:opacity-50 disabled:cursor-wait"
              title="下载文稿 PDF"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileDown className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">文稿</span>
            </button>

            {/* Favorite */}
            <button
              onClick={handleToggleFavorite}
              className={`p-2.5 sm:px-4 sm:py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 sm:border-none flex items-center gap-1.5 font-medium transition-colors justify-center flex-1 sm:flex-none ${
                isFavorited
                  ? "text-[#5830E0] bg-[#5830E0]/5 sm:bg-transparent"
                  : "text-slate-500 hover:text-[#5830E0] hover:bg-[#5830E0]/5 sm:hover:bg-transparent"
              }`}
            >
              <Bookmark
                className={`w-5 h-5 ${isFavorited ? "fill-current" : ""}`}
              />
              <span className="hidden sm:inline">收藏</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 sm:border-none flex items-center gap-1.5 font-medium text-slate-500 hover:text-[#5830E0] hover:bg-[#5830E0]/5 sm:hover:bg-transparent transition-colors justify-center flex-1 sm:flex-none"
            >
              <Share2 className="w-5 h-5" />
              <span className="hidden sm:inline">分享</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bilingual Transcript Preview & Intercept Modal */}
      {isTranscriptPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-350">
          <div
            className="absolute inset-0 bg-base-300/80 backdrop-blur-md cursor-pointer"
            onClick={() => setIsTranscriptPreviewOpen(false)}
          ></div>

          <div className="relative bg-base-100 rounded-[2.5rem] p-6 sm:p-10 max-w-lg w-full border border-base-250/60 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => setIsTranscriptPreviewOpen(false)}
              className="absolute right-6 top-6 p-2 rounded-xl text-base-content opacity-40 hover:opacity-100 hover:bg-base-200 transition-colors active:scale-95"
              aria-label="关闭"
            >
              <X size={20} />
            </button>

            {/* Glowing Label / Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 w-fit mb-4">
              <Sparkles size={12} className="fill-current animate-pulse" />{" "}
              文稿预览
            </div>

            {/* ── PDF Page Replica ── */}
            <div className="relative rounded-xl overflow-hidden mb-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)] border border-gray-200 dark:border-gray-600">
              <div
                className="bg-white select-none"
                style={{ aspectRatio: "595 / 560" }}
              >
                <div className="px-[9.4%] pt-[3%] pb-[8.3%] h-full flex flex-col">
                  {/* ── Page Header ── */}
                  <div className="flex justify-between items-baseline mb-1">
                    <span
                      className="text-[0.55rem] sm:text-[0.65rem] font-medium truncate"
                      style={{ color: "#003366" }}
                    >
                      远路播客 |{" "}
                      {transcriptPreview?.podcastTitle ||
                        episode.podcast?.title ||
                        "远路播客"}
                    </span>
                    <span
                      className="text-[0.45rem] sm:text-[0.5rem] font-medium flex-shrink-0 ml-2"
                      style={{ color: "#666" }}
                    >
                      AI翻译 仅供参考
                    </span>
                  </div>
                  <div className="h-[0.5px] bg-gray-300 mb-3 sm:mb-4"></div>

                  {/* ── Title Block with Cover ── */}
                  <div className="flex items-start gap-2 sm:gap-3 mb-1">
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[0.7rem] sm:text-[0.8rem] font-bold leading-snug mb-0.5"
                        style={{ color: "#212121" }}
                      >
                        {transcriptPreview?.podcastTitle ||
                          episode.podcast?.title ||
                          "远路播客"}
                      </p>
                      <p
                        className="text-[0.6rem] sm:text-[0.7rem] font-semibold leading-snug break-words"
                        style={{ color: "#003366" }}
                      >
                        {transcriptPreview?.episodeTitle || episode.title}
                      </p>
                    </div>
                    {(transcriptPreview?.coverUrl || episode.coverUrl) && (
                      <img
                        src={transcriptPreview?.coverUrl || episode.coverUrl}
                        alt=""
                        className="w-14 sm:w-[70px] aspect-video rounded object-cover flex-shrink-0"
                      />
                    )}
                  </div>
                  <div className="h-[1px] bg-gray-700 my-1.5 sm:my-2"></div>

                  {/* ── Transcript Blocks (max 4) ── */}
                  <div className="flex-1 space-y-2.5 sm:space-y-3 mt-1">
                    {transcriptPreview?.subtitles &&
                    transcriptPreview.subtitles.length > 0 ? (
                      transcriptPreview.subtitles.map((sub, i) => (
                        <div key={i}>
                          <p
                            className="text-[0.6rem] sm:text-[0.65rem] leading-relaxed"
                            style={{
                              color: "#000",
                              fontFamily: "'Roboto', serif",
                            }}
                          >
                            {sub.textEn}
                          </p>
                          <p
                            className="text-[0.5rem] sm:text-[0.55rem] leading-relaxed mt-0.5"
                            style={{
                              color: "rgba(0,0,0,0.75)",
                              fontFamily: "'Noto Sans SC', sans-serif",
                            }}
                          >
                            {sub.textZh}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span
                          className="text-[0.6rem]"
                          style={{ color: "#999" }}
                        >
                          暂无预览数据
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── Page Footer ── */}
                  <div className="mt-auto pt-1">
                    <div className="h-[0.4px] bg-gray-300 mb-1"></div>
                    <div className="flex justify-between">
                      <span
                        className="text-[0.4rem] sm:text-[0.42rem]"
                        style={{ color: "#666" }}
                      >
                        远路播客&nbsp;&nbsp;&nbsp;&nbsp;wxkzd.com
                      </span>
                      <span
                        className="text-[0.4rem] sm:text-[0.42rem]"
                        style={{ color: "#666" }}
                      >
                        共{" "}
                        {transcriptPreview
                          ? Math.max(
                              1,
                              1 +
                                Math.ceil(
                                  Math.max(
                                    0,
                                    transcriptPreview.totalSubtitles - 8,
                                  ) / 12,
                                ),
                            )
                          : 1}{" "}
                        页，第 1 页
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gaussian blur gradient mask over bottom portion */}
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-base-100 via-base-100/85 to-transparent pointer-events-none"></div>
            </div>

            {/* Intercept Card with Sincere Advocacy */}
            <div className="bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-2xl p-6 border border-indigo-500/10 text-center space-y-4 relative">
              {/* <div className="w-10 h-10 bg-indigo-500/10 text-indigo-600 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                <Crown size={20} />
              </div> */}

              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-sm shadow-indigo-500">
                <Crown size={20} className="animate-pulse" />
              </div>
              <h4 className="text-lg font-black text-indigo-950 dark:text-indigo-300">
                这里是会员专享内容
              </h4>

              <p className="text-xs sm:text-sm text-base-content opacity-75 leading-relaxed font-semibold px-2">
                为了支持网站长期高质量运转，此内容仅向赞助会员开放。如果您喜欢这里的内容，欢迎加入我们的会员社区，享受专属权益。
              </p>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setIsTranscriptPreviewOpen(false);
                    router.push("/auth/subscribe");
                  }}
                  className="flex-1 btn btn-primary h-11 min-h-[44px] rounded-xl text-xs font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  去看看赞助方案
                </button>
                <button
                  onClick={() => setIsTranscriptPreviewOpen(false)}
                  className="btn btn-ghost h-11 min-h-[44px] rounded-xl text-xs font-bold text-base-content opacity-50 hover:bg-base-200 opacity-50 transition-colors"
                >
                  暂不需要
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
