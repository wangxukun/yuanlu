import { NextRequest, NextResponse } from "next/server";
import { favoritesService } from "@/core/favorites/favorites.service";
import { requireAuth } from "@/core/auth/guard";

export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;
  const session = authResult.session;

  try {
    // 从请求体中获取数据
    const formData = await request.formData();
    // 显式转换所有字段为字符串
    const stringifyField = (field: FormDataEntryValue | null) =>
      field instanceof File ? field.name : String(field || "");

    const podcastid = stringifyField(formData.get("podcastid"));
    const userid = stringifyField(formData.get("userid"));

    // 验证参数有效性
    if (!podcastid || !userid) {
      return NextResponse.json({
        success: false,
        message: "缺少参数",
        status: 400,
      });
    }

    // 执行删除操作
    const result = await favoritesService.removePodcastFavorite(
      userid,
      podcastid,
    );

    // 检查是否成功删除
    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.message || "Favorite podcast not found",
        status: 404,
      });
    }

    return NextResponse.json({
      success: true,
      message: result.message || "取消播客收藏成功",
      status: 200,
    });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({
      success: false,
      status: 500,
      message: "服务器错误",
    });
  }
}
