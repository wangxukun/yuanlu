import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { notificationService } from "@/core/notification/notification.service";

/**
 * GET /api/notification/list
 * 获取当前登录用户的通知列表和未读数量
 * requireAuth：Web Cookie 优先，移动端 Bearer Token 兜底（小程序端依赖）。
 */
export async function GET() {
  try {
    const guard = await requireAuth();
    if (!guard.ok) {
      return guard.response;
    }

    const data = await notificationService.getNotifications(
      guard.session.user.userid,
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error("[notification/list] Failed to fetch notifications:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
