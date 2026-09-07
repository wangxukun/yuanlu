import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { learningPathService } from "@/core/learning-path/learning-path.service";
import { CreateLearningPathSchema } from "@/core/learning-path/dto";

// 创建学习路径（移动端创建弹窗）：
// 包装 learningPathService.create，zod 校验复用 Web CreateLearningPathSchema。
// 输入无效 → 400 { success, message }；成功 → { success, data: { pathid } }。
export async function POST(request: NextRequest) {
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const body = await request.json().catch(() => null);
    // Android 端 description 可显式传 null，转换为 zod optional 的 undefined 口径
    const parsed = CreateLearningPathSchema.safeParse({
      pathName: body?.pathName,
      description: body?.description ?? undefined,
      isPublic: body?.isPublic,
    });
    if (!parsed.success) {
      const message =
        parsed.error.flatten().fieldErrors.pathName?.[0] ?? "输入无效";
      return NextResponse.json({ success: false, message }, { status: 400 });
    }

    const path = await learningPathService.create(
      guard.session.user.userid,
      parsed.data,
    );
    return NextResponse.json({
      success: true,
      message: "创建成功",
      data: { pathid: path.pathid },
    });
  } catch (error) {
    console.error("Error creating learning path:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 },
    );
  }
}
