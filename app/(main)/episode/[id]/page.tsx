import { fetchEpisodeById, fetchSubtitles } from "@/app/lib/data";
import EpisodeSummarize from "@/components/episode/EpisodeSummarize";
import EpisodeDocument from "@/components/episode/EpisodeDocument";

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // const searchParams = useSearchParams(); // 使用 useSearchParams() 访问 URL 参数
  // const initialCollected = searchParams.get("collected") === "true";
  // 状态管理：翻译状态
  // const [showTranslation, setShowTranslation] = useState(false);

  interface SubtitleItem {
    id: number;
    startTime: string;
    endTime: string;
    text: string;
  }

  const episode = await fetchEpisodeById(id);
  const subtitleEn: SubtitleItem[] =
    (await fetchSubtitles(episode.subtitleEnUrl as string)) || [];

  return (
    <div className="flex flex-col p-6 mt-0 w-full items-center justify-center mx-auto">
      <EpisodeSummarize episode={episode} />
      <EpisodeDocument subtitle={subtitleEn} />
    </div>
  );
}
