import { NextResponse } from "next/server";
import { generateSignatureUrl } from "@/lib/oss";
import {
  getDiscoverRanking,
  DISCOVER_RECOMMEND_LIMIT,
} from "@/lib/discover-recommend";
import { authWithMobile } from "@/core/auth/guard";

export async function GET() {
  try {
    // Best-effort 识别登录用户（web cookie / 移动端 Bearer，见 core/auth/guard），
    // 匿名访问回退全局推荐打分，不影响接口可用性
    const session = await authWithMobile().catch(() => null);
    const userId = session?.user?.userid ?? undefined;

    // 三端统一的「为您推荐」排序：推荐坑位在前（推荐序），其余按分数降序。
    // 响应字段与裸数组结构保持不变（Android/小程序零修改）。
    const { ranked, recommendedIds } = await getDiscoverRanking(
      userId,
      DISCOVER_RECOMMEND_LIMIT,
    );

    // 并行处理签名URL；isEditorPick 重算为「是否属于推荐集合」（恰前 8 个为 true），
    // 移动端客户端 filter(isEditorPick) 即得到服务端推荐列表
    const signedPodcasts = await Promise.all(
      ranked.map(async (p) => ({
        podcastid: p.podcastid,
        title: p.title,
        coverUrl: p.coverFileName
          ? await generateSignatureUrl(p.coverFileName, 3600 * 3)
          : null,
        coverFileName: p.coverFileName,
        description: p.description,
        platform: p.platform,
        isEditorPick: recommendedIds.has(p.podcastid),
        totalPlays: p.totalPlays,
        followerCount: p.followerCount,
        createAt: p.createAt,
        episodeCount: p.episodeCount,
        tags: p.tags,
      })),
    );

    return NextResponse.json(signedPodcasts);
  } catch (error) {
    console.error("[GET /api/podcast/list]", error);
    return NextResponse.json({ error: "Internal Server Error", status: 500 });
  }
}
