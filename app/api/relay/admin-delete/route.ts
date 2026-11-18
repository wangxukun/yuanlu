import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/core/auth/guard";
import { adminDeleteRoom } from "@/core/relay/relay.service";

/**
 * [weapp-backend] POST /api/relay/admin-delete — 管理员删除接力房/趣味合集。
 * Body: { roomId }；requireAdmin 守卫（Web Cookie / 移动端 Bearer 双口径）。
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const roomId = typeof body?.roomId === "string" ? body.roomId : "";
    if (!roomId) {
      return NextResponse.json(
        { success: false, error: "Missing roomId" },
        { status: 400 },
      );
    }
    const result = await adminDeleteRoom(guard.session.user.userid, roomId);
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
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error("[POST /api/relay/admin-delete]", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete relay room" },
      { status: 500 },
    );
  }
}
