import {
  Play,
  Pause,
  Lock,
  Bookmark,
  Share2,
  Mic,
  Download,
  FileDown,
  Loader2,
} from "lucide-react";
import { UseEpisodeSummarizeReturn } from "./useEpisodeSummarize";
import { usePlayerStore } from "@/store/player-store";

export function ActionButtons({
  hookOptions,
}: {
  hookOptions: UseEpisodeSummarizeReturn;
}) {
  const {
    isPlayingThis,
    isLocked,
    isFavorited,
    isGeneratingPdf,
    handlePlay,
    handleStartPractice,
    handleDownloadAudio,
    handleDownloadTranscript,
    handleToggleFavorite,
    handleShare,
  } = hookOptions;

  const setIsLyricsOpen = usePlayerStore((s) => s.setIsLyricsOpen);
  const setIsMobileSheetOpen = usePlayerStore((s) => s.setIsMobileSheetOpen);

  // 开始精听：开始播放并打开沉浸式逐字稿
  const handleImmersivePlay = (e: React.MouseEvent) => {
    handlePlay(e);
    if (!isPlayingThis && !isLocked) {
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setIsMobileSheetOpen(true);
      } else {
        setIsLyricsOpen(true);
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 py-2 border-y border-ink-100 dark:border-ink-800">
      {/* Row 1 on mobile / Left group on tablet & desktop */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        {/* 开始精听（主 CTA） */}
        <button
          onClick={handleImmersivePlay}
          className="bg-[#1F7A5C] hover:bg-[#1A6349] text-white px-5 sm:px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-colors flex-1 md:flex-none justify-center md:justify-start"
        >
          {isPlayingThis ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : isLocked ? (
            <Lock className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
          <span>{isPlayingThis ? "暂停" : "开始精听"}</span>
        </button>

        {/* Practice Button */}
        <button
          onClick={handleStartPractice}
          className="bg-accent-500 hover:bg-accent-600 text-white px-5 sm:px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-colors flex-1 md:flex-none justify-center md:justify-start"
        >
          {isLocked ? (
            <Lock className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
          <span>语音评测</span>
        </button>
      </div>

      {/* Row 2 on mobile / Right group on tablet & desktop */}
      <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-between md:justify-start">
        {/* Audio Download */}
        <button
          onClick={handleDownloadAudio}
          className="p-2.5 md:px-4 md:py-2.5 rounded-xl border border-ink-100 dark:border-ink-800 md:border-none flex items-center gap-1.5 font-medium transition-colors justify-center flex-1 md:flex-none text-ink-500 hover:text-[#1F7A5C] hover:bg-[#1F7A5C]/5 md:hover:bg-transparent"
          title="下载音频"
        >
          <Download className="w-5 h-5" />
          <span className="hidden md:inline">音频</span>
        </button>

        {/* Transcript Download */}
        <button
          onClick={handleDownloadTranscript}
          disabled={isGeneratingPdf}
          className="p-2.5 md:px-4 md:py-2.5 rounded-xl border border-ink-100 dark:border-ink-800 md:border-none flex items-center gap-1.5 font-medium transition-colors justify-center flex-1 md:flex-none text-ink-500 hover:text-[#1F7A5C] hover:bg-[#1F7A5C]/5 md:hover:bg-transparent disabled:opacity-50 disabled:cursor-wait"
          title="下载文稿 PDF"
        >
          {isGeneratingPdf ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <FileDown className="w-5 h-5" />
          )}
          <span className="hidden md:inline">文稿</span>
        </button>

        {/* Favorite */}
        <button
          onClick={handleToggleFavorite}
          title={isFavorited ? "取消收藏" : "收藏"}
          aria-label={isFavorited ? "取消收藏" : "收藏"}
          className={`p-2.5 md:px-4 md:py-2.5 rounded-xl border border-ink-100 dark:border-ink-800 md:border-none flex items-center gap-1.5 font-medium transition-colors justify-center flex-1 md:flex-none ${
            isFavorited
              ? "text-[#1F7A5C] bg-[#1F7A5C]/5 md:bg-transparent"
              : "text-ink-500 hover:text-[#1F7A5C] hover:bg-[#1F7A5C]/5 md:hover:bg-transparent"
          }`}
        >
          <Bookmark
            className={`w-5 h-5 ${isFavorited ? "fill-current" : ""}`}
          />
          <span className="hidden md:inline">收藏</span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          title="分享"
          aria-label="分享"
          className="p-2.5 md:px-4 md:py-2.5 rounded-xl border border-ink-100 dark:border-ink-800 md:border-none flex items-center gap-1.5 font-medium text-ink-500 hover:text-[#1F7A5C] hover:bg-[#1F7A5C]/5 md:hover:bg-transparent transition-colors justify-center flex-1 md:flex-none"
        >
          <Share2 className="w-5 h-5" />
          <span className="hidden md:inline">分享</span>
        </button>
      </div>
    </div>
  );
}
