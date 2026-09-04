import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { vocabularyService } from "@/core/vocabulary/vocabulary.service";

/**
 * POST /api/vocabulary/review  body: { vocabularyid, quality }
 * 提交一次复习打卡（quality: 0=忘记 1=模糊 2=认识 3=简单），
 * 服务端按 Leitner 间隔算法更新 proficiency/nextReviewAt。
 * submitReviewAction（Server Action）的 REST 等价实现，供 Android 复习卡片调用。
 */
export async function POST(req: Request) {
  try {
    // Web Cookie 优先，移动端 Bearer Token 兜底（Android 端依赖）
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;
    const userid = authResult.session.user.userid;

    const { vocabularyid, quality } = await req.json();

    if (!vocabularyid || ![0, 1, 2, 3].includes(Number(quality))) {
      return NextResponse.json(
        { success: false, message: "参数无效" },
        { status: 400 },
      );
    }

    const result = await vocabularyService.submitReview(
      userid,
      Number(vocabularyid),
      Number(quality),
    );

    return NextResponse.json({
      success: true,
      message: "打卡成功",
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
    console.error("Submit vocabulary review error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 },
    );
  }
}
