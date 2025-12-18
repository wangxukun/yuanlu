import { fetchPodcastById } from "@/lib/data";
import PodcastDetail from "@/components/podcast/PodcastDetail";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const podcast = await fetchPodcastById(id);

  return <PodcastDetail podcast={podcast} />;
}
