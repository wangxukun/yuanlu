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

export async function GET() {
  const list = await episodeService.getManagementList();
  return Response.json(list);
}
