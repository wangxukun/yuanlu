import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { cheerEntry } from "@/core/speech/leaderboard.service";

/**
 * [weapp-backend] POST /api/speech/leaderboard/cheer — 日榜点赞（打 call）。
 * Body: { targetUserid } → { likes, likedByMe }；当日幂等（social_likes
 * LB_ENTRY 每人每日一次），禁自赞。
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  try {
    const body = await req.json();
    const targetUserid =
      typeof body?.targetUserid === "string" ? body.targetUserid : "";
    if (!targetUserid) {
      return NextResponse.json(
        { success: false, error: "Missing targetUserid" },
        { status: 400 },
      );
    }

    const result = await cheerEntry(
      authResult.session.user.userid,
      targetUserid,
    );
    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          code: result.code,
          error: result.message ?? result.code,
        },
        { status: result.code === "USER_NOT_FOUND" ? 404 : 400 },
      );
    }
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[POST /api/speech/leaderboard/cheer]", error);
    return NextResponse.json(
      { success: false, error: "Failed to cheer" },
      { status: 500 },
    );
  }
}
