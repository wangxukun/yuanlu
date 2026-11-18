import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { listRooms } from "@/core/relay/relay.service";

/**
 * [weapp-backend] GET /api/relay/list — 接力房分层小窗口（任务单第十五项）。
 * Query: recruitBatch=1（推荐层换一批页码）。
 * 返回 { rooms, totalRecruiting, recruitHasMore }：我的招募(≤5) → 推荐接棒×5
 * → 最近完成合集×3；读取前懒清扫超时 24h 的招募房（T7 过期自动撤销）。
 */
export async function GET(req: Request) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  try {
    const recruitBatch =
      Number(new URL(req.url).searchParams.get("recruitBatch")) || 1;
    const data = await listRooms(authResult.session.user.userid, recruitBatch);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[GET /api/relay/list]", error);
    return NextResponse.json(
      { success: false, error: "Failed to list relay rooms" },
      { status: 500 },
    );
  }
}
