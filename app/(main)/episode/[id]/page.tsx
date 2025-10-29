import { fetchEpisodeById, mergeSubtitles } from "@/app/lib/data";
import EpisodeSummarize from "@/components/episode/EpisodeSummarize";
import EpisodeDocument from "@/components/episode/EpisodeDocument";

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const episode = await fetchEpisodeById(id);
  const subtitles = await mergeSubtitles(episode);

  return (
    <div className="flex flex-col p-6 mt-0 w-full items-center justify-center mx-auto bg-base-100">
      <EpisodeSummarize episode={episode} />
      <EpisodeDocument subtitle={subtitles} episode={episode} />
    </div>
  );
}
