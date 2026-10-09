import { sourceSerif } from "@/components/fonts";
import prisma from "@/lib/prisma";
import ChannelManager from "@/components/admin/channels/channel-manager";
import { getRecommendedChannels } from "@/lib/discover-service";

// 强制动态渲染，确保获取最新数据
export const dynamic = "force-dynamic";

export default async function Page() {
  const [channelRows, recommended] = await Promise.all([
    prisma.channel.findMany({ orderBy: { sortOrder: "asc" } }),
    getRecommendedChannels(),
  ]);

  const rowByKey = new Map(
    channelRows.map((r) => [r.name.trim().toLowerCase(), r]),
  );

  const items = recommended.map((r) => {
    const row = rowByKey.get(r.name.trim().toLowerCase()) ?? null;
    return {
      name: r.name,
      podcastCount: r.podcastCount,
      episodeCount: r.episodeCount,
      totalPlays: r.totalPlays,
      coverUrl: r.coverUrl,
      row: row
        ? {
            channelid: row.channelid,
            coverFileName: row.coverFileName,
            description: row.description,
            sortOrder: row.sortOrder,
          }
        : null,
    };
  });

  const managedCount = items.filter((i) => i.row).length;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1
          className={`${sourceSerif.className} text-3xl font-bold text-ink-900`}
        >
          频道管理
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          配置发现页频道列表的品牌横幅、描述与展示顺序。已配置 {managedCount} /
          共 {items.length} 个频道，未配置的频道展示代表节目封面并按播放量排序。
        </p>
      </div>

      <ChannelManager items={items} />
    </div>
  );
}
