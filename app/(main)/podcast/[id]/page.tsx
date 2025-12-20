// import { fetchPodcastById } from "@/lib/data";
import PodcastDetail from "@/components/podcast/PodcastDetail";
import { getPodcastDetail } from "@/lib/podcast-service";
import { notFound } from "next/navigation";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  // const podcast = await fetchPodcastById(id);
  // 直接在服务端调用数据库逻辑，会自动带上 auth() session
  const podcast = await getPodcastDetail(id);

  if (!podcast) {
    notFound();
  }

  return <PodcastDetail podcast={podcast} />;
}
