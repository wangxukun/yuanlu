import { NextRequest, NextResponse } from "next/server";
import { favoritesService } from "@/core/favorites/favorites.service";
import { requireAuth } from "@/core/auth/guard";

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  try {
    // 从请求体中获取数据
    const formData = await request.formData();
    // 显式转换所有字段为字符串
    const stringifyField = (field: FormDataEntryValue | null) =>
      field instanceof File ? field.name : String(field || "");

    const sessionUserId = authResult.session.user.userid;
    const podcastid = stringifyField(formData.get("podcastid"));
    const clientUserId = stringifyField(formData.get("userid"));

    // 检查是否缺少参数
    if (!podcastid) {
      return NextResponse.json({
        success: false,
        message: "缺少参数",
        status: 400,
      });
    }
    // [B2] 归属固定取会话用户；兼容旧客户端传 userid，跨号越权直接拒绝
    if (clientUserId && clientUserId !== sessionUserId) {
      return NextResponse.json(
        { success: false, message: "无权操作他人收藏", status: 403 },
        { status: 403 },
      );
    }

    const result = await favoritesService.addPodcastFavorite({
      userId: sessionUserId,
      targetId: podcastid,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.message || "收藏播客失败",
        status: 500,
      });
    }

    return NextResponse.json({
      success: true,
      message: result.message || "收藏播客成功",
      status: 200,
    });
  } catch (error) {
    console.error("播客收藏时出错:", error);

    return NextResponse.json({
      success: false,
      message: "服务器错误",
      status: 500,
    });
  }
}
