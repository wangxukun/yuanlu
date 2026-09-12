import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { sentencesService } from "@/core/sentences/sentences.service";
import { updateSentenceMetaSchema } from "@/core/sentences/dto";

/**
 * POST /api/sentences/meta
 * 更新句子的标签与笔记（收藏后快捷打标签 / 句子本内编辑）。
 */
export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  try {
    const body = await request.json();
    const parsed = updateSentenceMetaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "参数无效（标签最多 10 个）" },
        { status: 400 },
      );
    }

    const result = await sentencesService.updateMeta(
      authResult.session.user.userid,
      parsed.data,
    );

    return NextResponse.json({
      success: true,
      message: "已保存",
      data: result,
    });
  } catch (error) {
    console.error("[POST /api/sentences/meta]", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "更新失败",
      },
      { status: 400 },
    );
  }
}
