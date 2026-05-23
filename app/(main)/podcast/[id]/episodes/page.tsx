import { getPodcastDetail } from "@/lib/podcast-service";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import AllEpisodesList from "@/components/podcast/AllEpisodesList";
import { auth } from "@/auth";
import { episodeService } from "@/core/episode/episode.service";

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
  const session = await auth();
  const userId = session?.user?.userid;

  // 并行请求：获取播客详情和第一页剧集数据（默认 20 条，按发布时间倒序）
  const [podcast, episodesData] = await Promise.all([
    getPodcastDetail(id),
    episodeService.getPodcastEpisodes(id, { page: 1, limit: 20, userId }),
  ]);

  if (!podcast) {
    notFound();
  }

  return (
    <AllEpisodesList
      podcastId={podcast.podcastid}
      podcastTitle={podcast.title}
      podcastCoverUrl={podcast.coverUrl || ""}
      initialEpisodes={episodesData.episodes}
      total={episodesData.total}
      hasMore={episodesData.hasMore}
    />
  );
}
