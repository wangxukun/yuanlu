import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { sentencesService } from "@/core/sentences/sentences.service";

/**
 * POST /api/sentences/delete  { id: number }
 * 删除收藏句子（句子本看板操作）。
 */
export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  try {
    const body = await request.json().catch(() => ({}));
    const id = Number(body?.id);
    if (!Number.isInteger(id)) {
      return NextResponse.json(
        { success: false, message: "参数无效" },
        { status: 400 },
      );
    }

    await sentencesService.deleteSentence(authResult.session.user.userid, id);

    return NextResponse.json({ success: true, message: "已删除" });
  } catch (error) {
    console.error("[POST /api/sentences/delete]", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "删除失败",
      },
      { status: 400 },
    );
  }
}
