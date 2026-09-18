import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { learningPathService } from "@/core/learning-path/learning-path.service";
import { CreateLearningPathSchema } from "@/core/learning-path/dto";
import { FREE_PATH_LIMIT, PATH_QUOTA_EXCEEDED } from "@/lib/quota";
import { recordConversionEvent } from "@/lib/track";

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

    const result = await learningPathService.create(
      guard.session.user.userid,
      parsed.data,
    );

    // [P3-h] 免费路径配额触墙（仅新增方向）：403 + code，Android 端可据此
    // 弹会员引导（path_quota 场景，与 Web 口径同源）；埋点与 server action
    // 双入口对齐（P3-a"双口径埋点"惯例，Android 漏斗可见）
    if (result.quotaExceeded || !result.path) {
      await recordConversionEvent({
        eventType: "QUOTA_BLOCKED",
        source: "path_quota",
        userid: guard.session.user.userid,
        metadata: { limit: result.limit, totalCount: result.totalCount },
      });
      return NextResponse.json(
        {
          success: false,
          code: PATH_QUOTA_EXCEEDED,
          message: `免费用户最多创建 ${FREE_PATH_LIMIT} 条学习路径，升级 PRO 解锁无限路径`,
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "创建成功",
      data: { pathid: result.path.pathid },
    });
  } catch (error) {
    console.error("Error creating learning path:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 },
    );
  }
}
