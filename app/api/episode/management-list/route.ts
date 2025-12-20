/**
 * Route 层 = 接收 HTTP 请求，调用 Service，返回 HTTP 响应
 *
 * API Route（Controller）
 *     ↓ 调用
 * Service（业务逻辑层）
 *     ↓ 调用
 * Repository（数据库层）
 *     ↓ 使用
 * Mapper（对象转换）
 */
import { episodeService } from "@/core/episode/episode.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // [修改] 获取 URL 查询参数
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query") || undefined;
    const podcastId = searchParams.get("podcastId") || undefined;

    // [修改] 将参数传递给 service
    const list = await episodeService.getManagementList(query, podcastId);

    return NextResponse.json(list);
  } catch (error) {
    console.error("获取剧集列表时出错:", error);
    return NextResponse.json({
      success: false,
      message: "服务器错误",
      status: 500,
    });
  }
}
