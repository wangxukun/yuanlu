import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { sentencesService } from "@/core/sentences/sentences.service";
import { toggleSentenceSaveSchema } from "@/core/sentences/dto";

/**
 * POST /api/sentences/toggle
 * 切换句子收藏（与 server action toggleSentenceSave 同一 service 入口，
 * 供移动端 Bearer 调用与 fetch 兜底）。
 */
export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  try {
    const body = await request.json();
    const parsed = toggleSentenceSaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "参数无效" },
        { status: 400 },
      );
    }

    const result = await sentencesService.toggleSave(
      authResult.session.user.userid,
      parsed.data,
    );

    return NextResponse.json({
      success: true,
      message: result.saved ? "已收藏该句子" : "已取消收藏",
      data: result,
    });
  } catch (error) {
    console.error("[POST /api/sentences/toggle]", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 },
    );
  }
}
