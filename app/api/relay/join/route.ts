import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { joinRoom } from "@/core/relay/relay.service";

/**
 * [weapp-backend] POST /api/relay/join — 接棒压轴（第 3 棒）。
 * Body: { roomId, recognitionId, audioBase64 }；成功即生成合集并 COMPLETED。
 */
const STATUS_OF: Record<string, number> = {
  ROOM_NOT_FOUND: 404,
  ROOM_NOT_RECRUITING: 409,
  ROOM_FULL: 409,
  INVALID_RECOGNITION: 400,
  EMPTY_AUDIO: 400,
  AUDIO_TOO_LARGE: 400,
  UPLOAD_FAILED: 500,
};

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  try {
    const body = await req.json();
    const roomId = typeof body?.roomId === "string" ? body.roomId : "";
    const recognitionId = Number(body?.recognitionId);
    const audioBase64 =
      typeof body?.audioBase64 === "string" ? body.audioBase64 : "";

    if (!roomId || !Number.isInteger(recognitionId) || recognitionId <= 0) {
      return NextResponse.json(
        { success: false, error: "Missing roomId or recognitionId" },
        { status: 400 },
      );
    }

    const result = await joinRoom({
      userid: authResult.session.user.userid,
      roomId,
      recognitionId,
      audioBase64,
    });
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
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[POST /api/relay/join]", error);
    return NextResponse.json(
      { success: false, error: "Failed to join relay room" },
      { status: 500 },
    );
  }
}
