import { NextRequest, NextResponse } from "next/server";
import { favoritesService } from "@/core/favorites/favorites.service";
import { requireAuth } from "@/core/auth/guard";

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  try {
    const formData = await request.formData();
    // 显式转换所有字段为字符串
    const stringifyField = (field: FormDataEntryValue | null) =>
      field instanceof File ? field.name : String(field || "");

    const episodeid = stringifyField(formData.get("episodeid"));
    const userid = stringifyField(formData.get("userid"));

    // 检查是否缺少参数
    if (!episodeid || !userid) {
      return NextResponse.json({
        success: false,
        message: "缺少参数",
        status: 400,
      });
    }

    const result = await favoritesService.addEpisodeFavorite({
      userId: userid,
      targetId: episodeid,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.message || "收藏剧集失败",
        status: 500,
      });
    }

    return NextResponse.json({
      success: true,
      message: result.message || "收藏剧集成功",
      status: 200,
    });
  } catch (error) {
    console.error("剧集收藏时出错:", error);

    return NextResponse.json({
      success: false,
      message: "服务器错误",
      status: 500,
    });
  }
}
