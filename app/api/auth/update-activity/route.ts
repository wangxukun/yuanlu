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

    // [健壮性修复] 在这里也进行取整，作为第一道防线
    // 如果前端传来 0.5s，我们为了 Daily Activity (Int) 的兼容性，将其视为 0 或 1
    let seconds = 0;
    if (typeof body.seconds === "number") {
      seconds = Math.round(body.seconds);
    }

    // 3. 构建 DTO
    const dto: UpdateUserActivityDto = {
      userId: session.user.userid,
      seconds: seconds,
    };

    // 4. 调用 Service
    // 注意：如果 seconds 为 0，Service 层仍然会更新 lastActiveAt，这也是符合预期的（心跳保活）
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
