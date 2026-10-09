import { NextResponse } from "next/server";
import { getRecommendedChannels } from "@/lib/discover-service";

/**
 * GET /api/channels
 * Public API for the channel list (web 发现页/全部频道页共用同一数据源，
 * 微信小程序 yuanlu-weapp 与 Android yuanlu-android 消费)。
 * coverUrl 已解析为最终可访问地址：频道品牌横幅（7 天签名）或代表节目封面（3 小时签名）。
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const channels = await getRecommendedChannels();
    return NextResponse.json({
      success: true,
      data: channels.map((c) => ({
        name: c.name,
        coverUrl: c.coverUrl,
        podcastCount: c.podcastCount,
        episodeCount: c.episodeCount,
        totalPlays: c.totalPlays,
      })),
    });
  } catch (error) {
    console.error("[GET /api/channels]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
