import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { cancelRoom } from "@/core/relay/relay.service";

/**
 * [weapp-backend] POST /api/relay/cancel — 发起人撤销接力（未完成房）。
 * Body: { roomId }；校验发起人/RECRUITING/第 3 棒无真人，硬删房间与棒次。
 */
const STATUS_OF: Record<string, number> = {
  ROOM_NOT_FOUND: 404,
  NOT_INITIATOR: 403,
  NOT_CANCELLABLE: 409,
};

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
    const result = await cancelRoom(authResult.session.user.userid, roomId);
    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          code: result.code,
          error: result.message ?? result.code,
        },
        { status: STATUS_OF[result.code] ?? 400 },
      );
    }
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error("[POST /api/relay/cancel]", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel relay room" },
      { status: 500 },
    );
  }
}
