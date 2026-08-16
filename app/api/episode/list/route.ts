import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/episode/list
 * 剧集全量列表，裸数组返回。
 *
 * 契约说明（勿破坏）：
 * - Android 端 ApiService.list() 依赖"不传参数 → 全量裸数组"的返回结构
 *   （见 ANDROID.md §API 约定），不能改为强制分页或包裹响应对象
 * - 仅返回已发布（status='published'）剧集：未发布内容的元数据不外泄
 * - 可选分页：page/pageSize（pageSize 上限 100），传入后按发布时间倒序分页返回，
 *   仍是裸数组切片；不传则返回全量、顺序与历史行为一致
 */
export async function GET(req: NextRequest) {
  try {
    const page = Number(req.nextUrl.searchParams.get("page")) || 0;
    const pageSize = Number(req.nextUrl.searchParams.get("pageSize")) || 0;
    const paginated = page >= 1 && pageSize >= 1;

    const episodes = await prisma.episode.findMany({
      where: { status: "published" },
      ...(paginated
        ? {
            orderBy: { publishAt: "desc" as const },
            skip: (page - 1) * Math.min(pageSize, 100),
            take: Math.min(pageSize, 100),
          }
        : {}),
      select: {
        // 明确选择需要字段
        episodeid: true,
        coverUrl: true,
        coverFileName: true,
        title: true,
        audioUrl: true,
        audioFileName: true,
        subtitleEnUrl: true,
        subtitleEnFileName: true,
        subtitleZhUrl: true,
        subtitleZhFileName: true,
        subtitleBilingualUrl: true,
        subtitleBilingualFileName: true,
        publishAt: true,
        createAt: true,
        status: true,
        isExclusive: true,
        isCommentEnabled: true,
        podcast: {
          select: {
            podcastid: true,
            title: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return NextResponse.json(episodes);
  } catch (error) {
    // 确保异常时也释放连接
    await prisma.$disconnect();
    console.error("[GET /api/episode/list]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    // 最佳实践：在finally块中执行清理操作
    await prisma.$disconnect();
  }
}
