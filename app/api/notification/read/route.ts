import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { notificationService } from "@/core/notification/notification.service";

/**
 * PATCH /api/notification/read
 * 标记通知为已读
 *
 * 请求体格式：
 * - 标记单条：{ "notificationId": 1 }
 * - 标记全部：{ "all": true }
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.userid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.userid;

    const body = await request.json();

    // 标记全部已读
    if (body.all === true) {
      const result = await notificationService.markAllAsRead(userId);
      return NextResponse.json(result);
    }

    // 标记单条已读
    const notificationId = Number(body.notificationId);
    if (!notificationId || isNaN(notificationId)) {
      return NextResponse.json(
        { error: "Missing or invalid notificationId" },
        { status: 400 },
      );
    }

    try {
      const result = await notificationService.markAsRead(
        notificationId,
        userId,
      );
      return NextResponse.json(result);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "NOTIFICATION_NOT_FOUND") {
          return NextResponse.json(
            { error: "Notification not found" },
            { status: 404 },
          );
        }
        if (err.message === "FORBIDDEN") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      throw err;
    }
  } catch (error) {
    console.error("[notification/read] Failed to mark as read:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
