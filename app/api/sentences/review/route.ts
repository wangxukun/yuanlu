import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { sentencesService } from "@/core/sentences/sentences.service";
import { submitSentenceReviewSchema } from "@/core/sentences/dto";

/**
 * POST /api/sentences/review  body: { id, quality }
 * 提交一次句子复习打卡（quality: 0=忘记 1=模糊 2=认识 3=简单），
 * 服务端按 Leitner 间隔算法更新 proficiency/nextReviewAt
 * （/api/vocabulary/review 的句子本等价实现，供小程序/Android Bearer 调用）。
 */
export async function POST(req: Request) {
  try {
    // Web Cookie 优先，移动端 Bearer Token 兜底（Android/小程序端依赖）
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;
    const userid = authResult.session.user.userid;

    const body = await req.json();
    const parsed = submitSentenceReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "参数无效" },
        { status: 400 },
      );
    }

    const result = await sentencesService.submitReview(
      userid,
      parsed.data.id,
      parsed.data.quality,
    );

    return NextResponse.json({
      success: true,
      message: "打卡成功",
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "句子不存在") {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 404 },
        );
      }
      if (error.message === "无权操作此句子") {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 403 },
        );
      }
    }
    console.error("Submit sentence review error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 },
    );
  }
}
