import { MetadataRoute } from "next";
import { getPodcastsForSitemap } from "@/lib/podcast-service";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"; // 替换为你的真实域名

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. 获取所有播客数据 (一个只获取 ID 的轻量级 API)
  const podcasts = await getPodcastsForSitemap();

  const podcastEntries: MetadataRoute.Sitemap = podcasts.map((podcast) => ({
    url: `${BASE_URL}/podcast/${podcast.podcastid}`,
    lastModified: new Date(podcast.createAt || Date.now()),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // 2. 静态路由
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/discover`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  return [...staticRoutes, ...podcastEntries];
}
