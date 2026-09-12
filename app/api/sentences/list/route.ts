import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { sentencesService } from "@/core/sentences/sentences.service";
import { savedSentenceQuerySchema } from "@/core/sentences/dto";

/**
 * GET /api/sentences/list
 * 用户收藏列表（支持 episodeid/tag/from/to/q 多维筛选与中英文检索），
 * 供 PWA / Android 客户端复用（Cookie 优先、Bearer 兜底）。
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  try {
    const sp = req.nextUrl.searchParams;
    const parsed = savedSentenceQuerySchema.safeParse({
      episodeid: sp.get("episodeid") ?? undefined,
      tag: sp.get("tag") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      q: sp.get("q") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "筛选参数无效" },
        { status: 400 },
      );
    }

    const list = await sentencesService.getSavedSentences(
      authResult.session.user.userid,
      parsed.data,
    );

    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error("[GET /api/sentences/list]", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 },
    );
  }
}
