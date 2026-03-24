import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChannelData } from "@/core/channel/channel.service";
import ChannelClient from "@/components/channel/ChannelClient";

type Props = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const channelData = await getChannelData(decodedName);

  if (!channelData) {
    return { title: "频道未找到 | 远路播客" };
  }

  return {
    title: `${channelData.platformName} · Channel | 远路播客`,
    description: `${channelData.platformName} 频道 · ${channelData.podcastCount} Shows`,
    openGraph: {
      title: `${channelData.platformName} · Channel`,
      description: `探索 ${channelData.platformName} 旗下 ${channelData.podcastCount} 档热门播客`,
    },
  };
}

export default async function ChannelPage({ params }: Props) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const channelData = await getChannelData(decodedName);

  if (!channelData) {
    notFound();
  }

  return <ChannelClient data={channelData} />;
}
