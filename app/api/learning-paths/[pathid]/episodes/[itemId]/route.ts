import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/core/auth/guard";
import { learningPathService } from "@/core/learning-path/learning-path.service";

type RouteContext = { params: Promise<{ pathid: string; itemId: string }> };

// 从路径移除剧集（仅拥有者，移动端剧集行垃圾桶）：
// itemId = learning_path_items.id；权限经连表校验（service.removeEpisode）。
// 非拥有者 → 403；条目不存在 → 404（P2025）。
export async function DELETE(_request: NextRequest, props: RouteContext) {
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }

  const { pathid: pathidRaw, itemId: itemIdRaw } = await props.params;
  const pathid = Number(pathidRaw);
  const itemId = Number(itemIdRaw);
  if (!Number.isInteger(pathid) || pathid <= 0) {
    return NextResponse.json(
      { success: false, message: "路径 id 无效" },
      { status: 400 },
    );
  }
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return NextResponse.json(
      { success: false, message: "条目 id 无效" },
      { status: 400 },
    );
  }

  try {
    await learningPathService.removeEpisode(itemId, guard.session.user.userid);
    return NextResponse.json({ success: true, message: "已移除" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("无权")) {
      return NextResponse.json(
        { success: false, message: "无权操作该路径" },
        { status: 403 },
      );
    }
    if (message.includes("条目不存在")) {
      return NextResponse.json(
        { success: false, message: "该条目不存在或已被移除" },
        { status: 404 },
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { success: false, message: "该条目不存在或已被移除" },
        { status: 404 },
      );
    }
    console.error("Error removing episode from learning path:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 },
    );
  }
}
