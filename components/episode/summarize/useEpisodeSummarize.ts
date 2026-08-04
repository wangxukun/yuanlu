import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePlayerStore } from "@/store/player-store";
import { useUIStore } from "@/store/ui-store";
import { toggleEpisodeFavorite } from "@/lib/actions/favorite-actions";
import { Episode } from "@/core/episode/episode.entity";
import { checkExclusivePlay } from "@/lib/client/auth-utils";

export function useEpisodeSummarize(episode: Episode) {
  const pathname = usePathname();
  const router = useRouter();
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

  const isCurrentEpisode = currentEpisode?.episodeid === episode.episodeid;
  const isPlayingThis = isCurrentEpisode && isPlaying;

  const isLocked =
    episode.isExclusive &&
    (!session?.user ||
      (session.user.role !== "PREMIUM" && session.user.role !== "ADMIN"));

  const safeId = episode.episodeid;

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
      const res = await fetch(
        `/api/episode/download?episodeid=${episode.episodeid}`,
      );
      const data = await res.json();

      if (!data.success || !data.downloadUrl) {
        throw new Error(data.error || "获取下载链接失败");
      }

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
      usePlayerStore.getState().setIsPracticeOpen(true);
    } else {
      if (!session?.user) {
        (
          document.getElementById("email_check_modal_box") as HTMLDialogElement
        )?.showModal();
        return;
      }
      usePlayerStore.getState().setIsPracticeOpen(true);
    }
  };

  return {
    isFavorited,
    isLoadingFavorite,
    isGeneratingPdf,
    isTranslatingTitle,
    translatedTitle,
    isTranscriptPreviewOpen,
    setIsTranscriptPreviewOpen,
    transcriptPreview,
    isPlayingThis,
    isLocked,
    handleTranslateTitle,
    handleToggleFavorite,
    handleDownloadAudio,
    handleDownloadTranscript,
    handleShare,
    handlePlay,
    handleStartPractice,
    router,
  };
}

export type UseEpisodeSummarizeReturn = ReturnType<typeof useEpisodeSummarize>;
