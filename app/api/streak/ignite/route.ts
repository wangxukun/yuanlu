import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { igniteStreak } from "@/core/streak/weapp-streak.service";

/**
 * [weapp-backend] POST /api/streak/ignite — 点亮今日连胜（当日幂等，防刷天）。
 * Body: { recognitionId? }：带 = 跟读开口自动验收（校验归属+今日日界）；
 * 不带 = 手动点亮。→ { streakDays, ignitedToday, justIgnited, percentile }
 * justIgnited=false 表示今日已点亮过（只出满格鼓励文案，不涨天）。
 */
const STATUS_OF: Record<string, number> = {
  INVALID_RECOGNITION: 400,
  STALE_RECOGNITION: 400,
};

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult.response;

  try {
    const body = await req.json().catch(() => ({}));
    const raw = body?.recognitionId;
    const recognitionId = raw == null ? undefined : Number(raw);

    const result = await igniteStreak(
      authResult.session.user.userid,
      recognitionId,
    );
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
    console.error("[POST /api/streak/ignite]", error);
    return NextResponse.json(
      { success: false, error: "Failed to ignite streak" },
      { status: 500 },
    );
  }
}
