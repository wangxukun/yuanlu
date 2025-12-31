import { Episode } from "@/core/episode/episode.entity";
import InteractiveTranscript from "./InteractiveTranscript";
import { BookOpenIcon } from "@heroicons/react/24/outline";

interface MergedSubtitleItem {
  id: number;
  startTime: string;
  endTime: string;
  textEn: string;
  textZh: string;
}

interface EpisodeDocumentProps {
  subtitle: MergedSubtitleItem[];
  episode: Episode;
}

export default function EpisodeDocument({
  subtitle,
  episode,
}: EpisodeDocumentProps) {
  return (
    // [UI Polish] 营造“纸张”质感
    <div className="bg-base-100 rounded-[1.5rem] md:rounded-[2rem] shadow-sm ring-1 ring-base-200/50 overflow-hidden">
      {/* Header: 极简设计，类似文章标题栏 */}
      <div className="px-6 md:px-10 py-6 border-b border-base-100 flex justify-between items-center bg-base-100/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary">
            <BookOpenIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-lg font-bold text-base-content/90">
              精读逐字稿
            </h2>
            <p className="hidden sm:text-xs sm:inline text-base-content/40 font-medium">
              Interactive Transcript
            </p>
          </div>
        </div>

        {/* 这里未来可以放“字体大小调节”、“打印”等工具按钮 */}
        <div className="flex gap-2">
          <span className="badge badge-sm badge-ghost font-mono opacity-50">
            IA Translation{" "}
            <span className="hidden sm:inline">{subtitle.length} lines</span>
          </span>
        </div>
      </div>

      {/* Content Area */}
      {/* 增加内边距，让文字呼吸 */}
      <div className="p-4 md:p-8 lg:p-12 min-h-[500px]">
        <InteractiveTranscript subtitles={subtitle} episode={episode} />
      </div>
    </div>
  );
}
