import EpisodeList from "@/components/podcast/EpisodeList";
import { fetchPodcastById } from "@/lib/data";
import PodcastSummarize from "@/components/podcast/PodcastSummarize";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const podcast = await fetchPodcastById(id);

  return (
    <main className="bg-base-100">
      <div className="flex flex-col justify-center ...">
        <div className="w-full flex-col p-2 pt-4 justify-self-end">
          <PodcastSummarize podcast={podcast} />
        </div>

        <div className="justify-self-start md:overflow-y-auto">
          <div className="pt-4 p-2">
            <EpisodeList episodes={podcast.episode || []} />
          </div>
        </div>
      </div>
    </main>
  );
}
