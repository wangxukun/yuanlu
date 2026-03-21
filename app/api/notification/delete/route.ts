import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { notificationService } from "@/core/notification/notification.service";

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.userid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userid } = session.user;
    const body = await request.json();

    if (body.all) {
      // 批量删除全部
      const result =
        await notificationService.deleteMultipleNotifications(userid);
      return NextResponse.json(result);
    } else if (body.notificationIds && Array.isArray(body.notificationIds)) {
      // 批量删除指定ID
      const result = await notificationService.deleteMultipleNotifications(
        userid,
        body.notificationIds,
      );
      return NextResponse.json(result);
    } else if (body.notificationId) {
      // 单条删除
      const result = await notificationService.deleteNotification(
        body.notificationId,
        userid,
      );
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("[DELETE /api/notification/delete]", error);
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (message === "NOTIFICATION_NOT_FOUND") {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 },
      );
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
