import { Episode } from "@/core/episode/episode.entity";
import InteractiveTranscript from "./InteractiveTranscript";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

// 定义来自 mergeSubtitles 的数据结构
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
    // 使用 rounded-3xl 和 shadow-sm 营造现代感
    <div className="bg-base-100 rounded-3xl shadow-sm border border-base-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="bg-base-100/50 backdrop-blur-sm px-6 py-4 border-b border-base-200/60 flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-lg font-bold flex items-center gap-2 text-base-content">
          <span className="p-1.5 bg-primary/10 rounded-lg text-primary">
            <DocumentTextIcon className="w-5 h-5" />
          </span>
          精读逐字稿
        </h2>
        <span className="badge badge-sm badge-ghost font-mono opacity-70">
          AI Transcript
        </span>
      </div>

      {/* Content */}
      <div className="p-2 md:p-6 lg:p-8">
        <InteractiveTranscript subtitles={subtitle} episode={episode} />
      </div>
    </div>
  );
}
