import { listeningHistoryService } from "@/core/listening-history/listening-history.service";
import { requireAuth } from "@/core/auth/guard";
import { NextRequest, NextResponse } from "next/server";

// 收听历史列表（移动端）：Web 页面 /library/history 走服务端直渲，
// 该路由把同一 listeningHistoryService 暴露为分页 HTTP 接口供 Android 端拉取。
// requireAuth：Web Cookie 优先，移动端 Bearer Token 兜底。
export async function GET(request: NextRequest) {
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, Number(searchParams.get("pageSize")) || 20),
  );
  const statusParam = searchParams.get("status");
  const status =
    statusParam === "in-progress" || statusParam === "finished"
      ? statusParam
      : "all";

  try {
    const result = await listeningHistoryService.getUserHistoryPage(
      guard.session.user.userid,
      page,
      pageSize,
      status,
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching user history:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 },
    );
  }
}
