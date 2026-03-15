import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notificationService } from "@/core/notification/notification.service";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    // 简单的权限校验：确保用户已登录且为管理员
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { targetType, userIds, message, targetUrl } = body;

    if (!message || message.trim() === "") {
      return NextResponse.json(
        { error: "Message content cannot be empty" },
        { status: 400 },
      );
    }

    let targetUserIds: string[] = [];

    if (targetType === "all") {
      // 获取所有用户的 ID
      const allUsers = await prisma.user.findMany({
        select: { userid: true },
      });
      targetUserIds = allUsers.map((u) => u.userid);
    } else if (targetType === "specific") {
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json(
          { error: "Specific users requires at least one user ID" },
          { status: 400 },
        );
      }
      targetUserIds = userIds;
    } else {
      return NextResponse.json(
        { error: "Invalid target type" },
        { status: 400 },
      );
    }

    if (targetUserIds.length > 0) {
      console.log(`[Admin Notification] Attempting to send notifications to ${targetUserIds.length} users.`);
      // 这里的 P2003 错误可能是因为某些用户 ID 已经不存在了，或者 specific 模式下输入了错误 ID
      try {
        await notificationService.triggerSystemNotification(
          targetUserIds,
          message,
          targetUrl || undefined,
        );
      } catch (err: any) {
        if (err.code === 'P2003') {
          console.error("[Admin Notification] FK Violation (P2003). Checking if all target user IDs exist...");
          // 进行更细致的排查：找出哪些 ID 是无效的
          const existingUsers = await prisma.user.findMany({
            where: { userid: { in: targetUserIds } },
            select: { userid: true }
          });
          const existingIds = new Set(existingUsers.map(u => u.userid));
          const invalidIds = targetUserIds.filter(id => !existingIds.has(id));
          
          if (invalidIds.length > 0) {
            return NextResponse.json(
              { error: `Foreign key violation: ${invalidIds.length} IDs are invalid.`, invalidIds: invalidIds.slice(0, 10) },
              { status: 400 }
            );
          }
        }
        throw err;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sent to ${targetUserIds.length} users.`,
    });
  } catch (error: any) {
    console.error("[POST /api/admin/notification/send] Full Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
