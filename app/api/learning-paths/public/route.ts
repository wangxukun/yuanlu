import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { learningPathService } from "@/core/learning-path/learning-path.service";

// 公开路径列表（移动端「发现」Tab）：
// 包装 learningPathService.listPublic（排除当前用户，含其对这些路径的进度），
// 响应信封 { success, data }，对齐 Android GET api/learning-paths/public 契约。
export async function GET() {
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const paths = await learningPathService.listPublic(
      guard.session.user.userid,
    );
    return NextResponse.json({ success: true, data: paths });
  } catch (error) {
    console.error("Error fetching public learning paths:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 },
    );
  }
}
