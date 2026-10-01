import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { notificationService } from "@/core/notification/notification.service";

// 小程序端 wx.request 对 DELETE 携带 JSON body 存在平台差异，导出 POST 别名
// 走同一处理器兜底（Web 继续用 DELETE，互不影响；同 episode/progress 路由先例）。
export { DELETE as POST };

export async function DELETE(request: NextRequest) {
  try {
    // requireAuth：Web Cookie 优先，移动端 Bearer Token 兜底（小程序端依赖）
    const guard = await requireAuth();
    if (!guard.ok) {
      return guard.response;
    }

    const { userid } = guard.session.user;
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
