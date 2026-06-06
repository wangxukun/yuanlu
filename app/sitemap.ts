import { MetadataRoute } from "next";
import { getPodcastsForSitemap } from "@/lib/podcast-service";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"; // 替换为你的真实域名

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let podcastEntries: MetadataRoute.Sitemap = [];

  // 如果没有 DATABASE_URL (如 CI/CD 构建环境)，跳过数据库查询避免构建失败
  if (process.env.DATABASE_URL) {
    try {
      const podcasts = await getPodcastsForSitemap();
      podcastEntries = podcasts.map((podcast) => ({
        url: `${BASE_URL}/podcast/${podcast.podcastid}`,
        lastModified: new Date(podcast.createAt || Date.now()),
        changeFrequency: "weekly",
        priority: 0.8,
      }));
    } catch (e) {
      console.error(
        "Failed to generate podcast sitemap entries during build:",
        e,
      );
    }
  }

  // 静态路由
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
