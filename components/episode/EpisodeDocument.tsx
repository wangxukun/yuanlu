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
    <div className="w-full mt-8">
      <div className="bg-base-200 rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          📝 逐字稿 (Transcript)
        </h2>

        <InteractiveTranscript
          subtitles={subtitle}
          episode={episode} // [修改] 传递整个 episode 对象，而不仅仅是 ID
        />
      </div>
    </div>
  );
}
