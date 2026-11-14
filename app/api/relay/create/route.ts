import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { createRoom } from "@/core/relay/relay.service";

/**
 * [weapp-backend] POST /api/relay/create — 发起接力（第 1 棒）。
 * Body: { clipId, title?, recognitionId, audioBase64 }
 * 前端先走 /api/speech/evaluate 完成真评测（配额/会员全复用），携返回的
 * recognitionId + 同一段录音 base64 到此建房。
 */
const STATUS_OF: Record<string, number> = {
  CLIP_NOT_FOUND: 404,
  INVALID_RECOGNITION: 400,
  EMPTY_AUDIO: 400,
  AUDIO_TOO_LARGE: 400,
  CORPUS_UNAVAILABLE: 503,
  UPLOAD_FAILED: 500,
};

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  try {
    const body = await req.json();
    const clipId = typeof body?.clipId === "string" ? body.clipId : "";
    const title = typeof body?.title === "string" ? body.title : undefined;
    const recognitionId = Number(body?.recognitionId);
    const audioBase64 =
      typeof body?.audioBase64 === "string" ? body.audioBase64 : "";

    if (!clipId || !Number.isInteger(recognitionId) || recognitionId <= 0) {
      return NextResponse.json(
        { success: false, error: "Missing clipId or recognitionId" },
        { status: 400 },
      );
    }

    const result = await createRoom({
      userid: authResult.session.user.userid,
      clipId,
      title,
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
    console.error("[POST /api/relay/create]", error);
    return NextResponse.json(
      { success: false, error: "Failed to create relay room" },
      { status: 500 },
    );
  }
}
