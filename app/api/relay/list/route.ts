import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { listRooms } from "@/core/relay/relay.service";

/**
 * [weapp-backend] GET /api/relay/list — 接力房列表（招募优先、最近活跃在前）。
 * Query: limit=20（≤50）。需登录（移动端 Bearer / Web Cookie 双口径）。
 */
export async function GET(req: Request) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  try {
    const limit = Number(new URL(req.url).searchParams.get("limit")) || 20;
    const rooms = await listRooms(authResult.session.user.userid, limit);
    return NextResponse.json({ success: true, data: { rooms } });
  } catch (error) {
    console.error("[GET /api/relay/list]", error);
    return NextResponse.json(
      { success: false, error: "Failed to list relay rooms" },
      { status: 500 },
    );
  }
}
