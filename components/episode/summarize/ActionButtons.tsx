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

  return (
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
  );
}
