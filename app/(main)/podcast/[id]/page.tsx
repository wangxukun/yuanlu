import PodcastDetail from "@/components/podcast/PodcastDetail";
import { getPodcastDetail } from "@/lib/podcast-service";
import { notFound } from "next/navigation";
import { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
};

// 添加动态 Metadata 生成
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const podcast = await getPodcastDetail(id);

  if (!podcast) {
    return {
      title: "播客未找到",
    };
  }

  return {
    title: `${podcast.title} | 远路播客`,
    description: podcast.description?.slice(0, 150) + "...", // 截取前150个字符作为描述
    openGraph: {
      title: podcast.title,
      description: podcast.description || "",
      images: podcast.coverUrl ? [podcast.coverUrl] : [],
    },
  };
}

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
