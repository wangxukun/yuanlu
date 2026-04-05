import { getPodcastDetail } from "@/lib/podcast-service";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import AllEpisodesList from "@/components/podcast/AllEpisodesList";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const podcast = await getPodcastDetail(id);

  if (!podcast) {
    return {
      title: "播客未找到",
    };
  }

  return {
    title: `${podcast.title} - 全部剧集 | 远路播客`,
    description: `收听「${podcast.title}」的全部 ${podcast.episode?.length || 0} 集内容`,
    openGraph: {
      title: `${podcast.title} - 全部剧集`,
      description: podcast.description || "",
      images: podcast.coverUrl ? [podcast.coverUrl] : [],
    },
  };
}

export default async function EpisodesPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const podcast = await getPodcastDetail(id);

  if (!podcast) {
    notFound();
  }

  return (
    <AllEpisodesList
      podcastId={podcast.podcastid}
      podcastTitle={podcast.title}
      podcastCoverUrl={podcast.coverUrl}
      episodes={podcast.episode}
    />
  );
}
