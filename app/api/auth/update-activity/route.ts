import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { statsService } from "@/core/stats/stats.service";
import { UpdateUserActivityDto } from "@/core/stats/dto";

export async function POST(request: NextRequest) {
  try {
    // 1. 权限校验
    const session = await auth();
    if (!session?.user?.userid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. 参数解析
    const body = await request.json().catch(() => ({}));
    const seconds = typeof body.seconds === "number" ? body.seconds : 0;

    // 3. 构建 DTO
    const dto: UpdateUserActivityDto = {
      userId: session.user.userid,
      seconds: seconds,
    };

    // 4. 调用 Service
    await statsService.updateDailyActivity(dto);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API] Update activity failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
