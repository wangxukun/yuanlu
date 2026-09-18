import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { pathGenerateService } from "@/core/learning-path/path-generate.service";

/**
 * [P3-h] AI 学习路径生成（PRO 专属）：POST /api/learning-paths/generate
 *
 * Body: { topic: string }——学习主题/目标（如"商务英语入门"）。
 * 响应口径：
 *   200 { success, data: { pathid, pathName, itemCount } }  生成并落库成功
 *   403 { success:false, code:"PREMIUM_REQUIRED" }          免费用户（前端弹 path_ai_generate 场景窗）
 *   422 { success:false, code:"INVALID_TOPIC" | "NO_MATCH" } 输入/无匹配（前端降级手动创建）
 *   429 { success:false, code:"RATE_LIMITED" }               频率限制（15s 冷却 / 每日 5 次）
 *   503 { success:false, code:"LLM_UNAVAILABLE" }            LLM 失败（前端降级手动创建，不阻断）
 */
export async function POST(request: NextRequest) {
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json().catch(() => null);
    const topic = typeof body?.topic === "string" ? body.topic : "";

    const result = await pathGenerateService.generate(
      guard.session.user.userid,
      guard.session.user.role,
      topic,
    );

    if (!result.ok) {
      const status =
        result.code === "PREMIUM_REQUIRED"
          ? 403
          : result.code === "RATE_LIMITED"
            ? 429
            : result.code === "LLM_UNAVAILABLE"
              ? 503
              : 422;
      return NextResponse.json(
        {
          success: false,
          code: result.code,
          message: result.message ?? "生成失败",
        },
        { status },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        pathid: result.pathid,
        pathName: result.pathName,
        itemCount: result.itemCount,
      },
    });
  } catch (error) {
    console.error("[POST /api/learning-paths/generate]", error);
    return NextResponse.json(
      {
        success: false,
        code: "LLM_UNAVAILABLE",
        message: "生成失败，请稍后重试",
      },
      { status: 503 },
    );
  }
}
