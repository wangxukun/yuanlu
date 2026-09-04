import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { vocabularyService } from "@/core/vocabulary/vocabulary.service";

/**
 * GET /api/vocabulary/all
 * 当前用户的全量生词列表（生词本页面数据源）。
 * 与页面 SSR 共用 vocabularyService.getAllVocabulary：合并 Dictionary 表词典数据
 * （dictData）与剧集名（episodeTitle），日期字段统一转 ISO 字符串。
 * Web Cookie 优先，移动端 Bearer Token 兜底（Android 端依赖）。
 */
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;
    const userid = authResult.session.user.userid;

    const list = await vocabularyService.getAllVocabulary(userid);
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error("Fetch all vocabulary error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 },
    );
  }
}
