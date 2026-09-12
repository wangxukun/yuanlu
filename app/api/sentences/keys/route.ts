import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { sentencesService } from "@/core/sentences/sentences.service";

/**
 * GET /api/sentences/keys?episodeid=xxx
 * 字幕面板书签态：返回用户在该剧集已收藏的字幕句 subtitleId 列表，
 * 附带用户全部历史标签（收藏后快捷打标签候选）。
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  const episodeid = req.nextUrl.searchParams.get("episodeid");
  if (!episodeid) {
    return NextResponse.json(
      { success: false, message: "缺少参数 episodeid" },
      { status: 400 },
    );
  }

  try {
    const data = await sentencesService.getEpisodeSaveState(
      authResult.session.user.userid,
      episodeid,
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[GET /api/sentences/keys]", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 },
    );
  }
}
