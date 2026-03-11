import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { notificationService } from "@/core/notification/notification.service";

/**
 * GET /api/notification/list
 * 获取当前登录用户的通知列表和未读数量
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.userid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await notificationService.getNotifications(
      session.user.userid,
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
