import prisma from "@/lib/prisma";

/**
 * 频道品牌横幅数据源（channel 表）。
 * 横幅对象为私有 OSS（key 存 coverFileName），签名分发统一收敛在
 * discover-service；无行或 coverFileName 为空时频道回退代表节目封面。
 * 源图保留在 assets/channel-covers/，上传/入库脚本见 scripts/。
 */
export interface ChannelBrandRow {
  name: string;
  coverFileName: string | null;
  description: string | null;
  sortOrder: number;
}

/**
 * 一次查询取全量频道行，返回按小写 name 归一化的 Map
 * （podcast.platform 与 channel.name 的大小写可能漂移，归一化兜底）。
 */
export async function getChannelBrandRows(): Promise<
  Map<string, ChannelBrandRow>
> {
  try {
    const rows = await prisma.channel.findMany();
    return new Map(
      rows.map((r) => [
        r.name.trim().toLowerCase(),
        {
          name: r.name,
          coverFileName: r.coverFileName,
          description: r.description,
          sortOrder: r.sortOrder,
        },
      ]),
    );
  } catch (error) {
    // 表不可用（如迁移未执行的旧环境）时退化为无品牌横幅，不阻断发现页
    console.error("Failed to fetch channel brand rows:", error);
    return new Map();
  }
}
