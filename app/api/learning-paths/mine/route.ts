import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { learningPathService } from "@/core/learning-path/learning-path.service";

// 我的路径卡片摘要（移动端「我的集合」Tab）：
// 包装 learningPathService.listWithDetails（含进度/签名封面/创建者），
// 响应信封 { success, data }，对齐 Android GET api/learning-paths/mine 契约。
export async function GET() {
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const paths = await learningPathService.listWithDetails(
      guard.session.user.userid,
    );
    return NextResponse.json({ success: true, data: paths });
  } catch (error) {
    console.error("Error fetching my learning paths:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 },
    );
  }
}
