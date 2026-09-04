import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { vocabularyService } from "@/core/vocabulary/vocabulary.service";

/**
 * POST /api/vocabulary/status  body: { vocabularyid, status }
 * 更新生词状态（LEARNING <-> MASTERED）。
 * updateVocabularyStatusAction（Server Action）的 REST 等价实现，
 * 供 Android 生词本「标记为已掌握 / 重新学习」调用。
 */
export async function POST(req: Request) {
  try {
    // Web Cookie 优先，移动端 Bearer Token 兜底（Android 端依赖）
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;
    const userid = authResult.session.user.userid;

    const { vocabularyid, status } = await req.json();

    if (
      !vocabularyid ||
      !["LEARNING", "MASTERED"].includes(String(status).toUpperCase())
    ) {
      return NextResponse.json(
        { success: false, message: "参数无效" },
        { status: 400 },
      );
    }

    const normalized = String(status).toUpperCase() as "LEARNING" | "MASTERED";
    const result = await vocabularyService.updateStatus(
      userid,
      Number(vocabularyid),
      normalized,
    );

    return NextResponse.json({
      success: true,
      message: normalized === "MASTERED" ? "已标记为掌握" : "已放回生词本",
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "单词不存在") {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 404 },
        );
      }
      if (error.message === "无权操作此单词") {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 403 },
        );
      }
    }
    console.error("Update vocabulary status error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 },
    );
  }
}
