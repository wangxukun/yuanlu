import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { WxAuthService } from "@/core/auth/wx-auth.service";
import { WX_BIND_MESSAGES } from "@/core/auth/wx-bind.core";

/**
 * POST /api/user/wx/bind — 微信身份绑定（模块 E T3.2，虚拟支付前置）
 *
 * Body: { code }（wx.login 一次性 code）。requireAuth（Web Cookie 优先，
 * 小程序 Bearer 兜底）→ code2Session → 决策矩阵（首次绑定 / 幂等刷新
 * sessionKey / 一号多绑与换单绑拒绝）。sessionKey 不回传前端（签名密钥
 * 留服务端，下单接口 T4.3 直读 User 行）。
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuth();
    if (!guard.ok) {
      return guard.response;
    }

    const body = (await request.json()) as { code?: unknown };
    if (typeof body.code !== "string" || body.code.length === 0) {
      return NextResponse.json(
        { success: false, error: "参数不完整" },
        { status: 400 },
      );
    }

    const { decision } = await WxAuthService.bindWx(
      guard.session.user.userid!,
      body.code,
    );

    return NextResponse.json({
      success: true,
      message: WX_BIND_MESSAGES[decision],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "绑定失败",
      },
      { status: 400 },
    );
  }
}
