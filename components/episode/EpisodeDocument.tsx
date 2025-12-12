import { Episode } from "@/core/episode/episode.entity";
import InteractiveTranscript from "./InteractiveTranscript";

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
    <div className="bg-base-100 rounded-3xl shadow-sm border border-base-200 overflow-hidden">
      {/* 头部装饰 */}
      <div className="bg-base-200/50 px-6 py-4 border-b border-base-200 flex justify-between items-center">
        <h2 className="text-lg font-bold flex items-center gap-2">
          📝 精读逐字稿
        </h2>
        <span className="text-xs badge badge-ghost">AI 生成</span>
      </div>

      <div className="p-2 md:p-6">
        <InteractiveTranscript subtitles={subtitle} episode={episode} />
      </div>
    </div>
  );
}
