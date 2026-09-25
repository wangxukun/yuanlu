import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { episodeDeepDiveService } from "@/core/episode/episode-deep-dive.service";

/**
 * [P3-i②] AI 剧集深度精讲（PRO 专属）：GET /api/episode/deep-dive?episodeid=
 *
 * 响应口径：
 *   200 { success, data: { content, cached } }        精讲内容（每集缓存一次）
 *   403 { success:false, code:"PREMIUM_REQUIRED" }    免费用户（前端弹 episode_deep_dive 场景窗）
 *   404 { success:false, code:"EPISODE_NOT_FOUND" }   剧集不存在
 *   422 { success:false, code:"NO_SUBTITLE" }         无字幕不可生成
 *   503 { success:false, code:"LLM_UNAVAILABLE" }     LLM 失败（前端提示稍后再试，不阻断页面）
 *
 * probe=1：仅探测缓存是否命中（小程序首点分流提示用），不触发生成——
 *   200 { success, data: { cached } }
 */
export async function GET(req: NextRequest) {
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;

  const episodeid = req.nextUrl.searchParams.get("episodeid");
  if (!episodeid) {
    return NextResponse.json(
      { success: false, code: "EPISODE_NOT_FOUND", message: "缺少 episodeid" },
      { status: 404 },
    );
  }

  try {
    // probe=1：仅探测缓存命中，不触发生成（小程序用它分流"安静加载"与
    // "首次生成约需 30-60 秒"提示，避免缓存命中时提示一闪而过）
    if (req.nextUrl.searchParams.get("probe") === "1") {
      const probe = await episodeDeepDiveService.probeDeepDive(
        guard.session.user,
        episodeid,
      );
      if (!probe.ok) {
        return NextResponse.json(
          {
            success: false,
            code: probe.code,
            message: probe.message ?? "生成失败",
          },
          { status: 403 },
        );
      }
      return NextResponse.json({
        success: true,
        data: { cached: probe.cached },
      });
    }

    const result = await episodeDeepDiveService.getDeepDive(
      guard.session.user,
      episodeid,
    );

    if (!result.ok) {
      const status =
        result.code === "PREMIUM_REQUIRED"
          ? 403
          : result.code === "EPISODE_NOT_FOUND"
            ? 404
            : result.code === "NO_SUBTITLE"
              ? 422
              : 503;
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
      data: { content: result.content, cached: result.cached },
    });
  } catch (error) {
    console.error("[GET /api/episode/deep-dive]", error);
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
