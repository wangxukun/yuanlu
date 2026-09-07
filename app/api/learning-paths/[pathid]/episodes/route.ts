import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/core/auth/guard";
import { learningPathService } from "@/core/learning-path/learning-path.service";

type RouteContext = { params: Promise<{ pathid: string }> };

// 添加剧集到路径末尾（仅拥有者，移动端添加剧集弹窗）：
// 剧集已在列表中 → 200 + success=false + message（业务失败口径，客户端直接 toast message）；
// 非拥有者/路径不存在 → 403（service 统一抛“无权操作”）；
// episodeid 不存在 → 外键 P2003 → 400。
export async function POST(request: NextRequest, props: RouteContext) {
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }

  const pathidRaw = (await props.params).pathid;
  const pathid = Number(pathidRaw);
  if (!Number.isInteger(pathid) || pathid <= 0) {
    return NextResponse.json(
      { success: false, message: "路径 id 无效" },
      { status: 400 },
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const episodeid = body?.episodeid;
    if (typeof episodeid !== "string" || episodeid.trim() === "") {
      return NextResponse.json(
        { success: false, message: "缺少有效的剧集 id" },
        { status: 400 },
      );
    }

    await learningPathService.addEpisode(
      pathid,
      guard.session.user.userid,
      episodeid,
    );
    return NextResponse.json({ success: true, message: "已添加" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("已在列表中")) {
      return NextResponse.json(
        { success: false, message: "该剧集已在列表中" },
        { status: 200 },
      );
    }
    if (message.includes("无权")) {
      return NextResponse.json(
        { success: false, message: "无权操作该路径" },
        { status: 403 },
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { success: false, message: "剧集不存在" },
        { status: 400 },
      );
    }
    console.error("Error adding episode to learning path:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 },
    );
  }
}
