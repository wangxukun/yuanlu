import { NextRequest, NextResponse } from "next/server";
import { authWithMobile } from "@/core/auth/guard";
import { recordVisitorLog } from "@/lib/visitor-log";

/**
 * POST /api/track-visit —— 小程序（及未来其他非浏览器客户端）访问上报。
 *
 * 小程序端在页面切换（onShow / 路由变化）时调用，服务端写入 VisitorLog，
 * path 统一加 "wxapp/" 前缀与 Web 页面访问（"/xxx"）区分；写入后自动进入
 * 访问日志页、IP 归属地解析与转化分析页的"在线 · 登录用户 / 游客"热力图。
 *
 * 契约：
 * - Body(JSON)：{ "path": "pages/episode/detail?id=xxx" }
 *   小程序本地页面路径，可带 query；非空、≤240 字符，超限/缺失静默丢弃
 * - Headers：Authorization: Bearer <jwt> 可选——匿名访问按 IP 计为游客，
 *   与 Web 端游客同口径（登录用户同日同 IP 只计登录用户）
 * - 响应：恒 204 无 body（fire-and-forget 埋点，客户端无需处理失败）
 * - User-Agent 取请求头（微信小程序 wx.request 自动携带 MicroMessenger 标识）
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const rawPath = typeof body?.path === "string" ? body.path.trim() : "";
    if (!rawPath || rawPath.length > 240) {
      return new NextResponse(null, { status: 204 });
    }

    // [T2.2] authWithMobile：cookie 优先、小程序/Android Bearer 回落，
    // 未登录返回 null → 记为游客（userid 空，按 IP 去重）
    const session = await authWithMobile();

    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

    await recordVisitorLog({
      ip,
      userAgent: req.headers.get("user-agent") || "Unknown",
      path: `wxapp/${rawPath}`,
      userid: session?.user?.userid ?? null,
    });
  } catch (error) {
    console.error("[POST /api/track-visit]", error);
    // 上报接口对客户端永远返回成功，避免影响小程序 UI
  }
  return new NextResponse(null, { status: 204 });
}
