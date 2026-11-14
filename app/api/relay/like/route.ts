import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { likeRoom } from "@/core/relay/relay.service";

/**
 * [weapp-backend] POST /api/relay/like — 接力房点赞（当日幂等，读时 count）。
 * Body: { roomId } → { likes, likedByMe }
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  try {
    const body = await req.json();
    const roomId = typeof body?.roomId === "string" ? body.roomId : "";
    if (!roomId) {
      return NextResponse.json(
        { success: false, error: "Missing roomId" },
        { status: 400 },
      );
    }

    const result = await likeRoom(authResult.session.user.userid, roomId);
    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          code: result.code,
          error: result.message ?? result.code,
        },
        { status: result.code === "ROOM_NOT_FOUND" ? 404 : 400 },
      );
    }
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[POST /api/relay/like]", error);
    return NextResponse.json(
      { success: false, error: "Failed to like relay room" },
      { status: 500 },
    );
  }
}
