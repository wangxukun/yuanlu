import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notificationService } from "@/core/notification/notification.service";

/**
 * POST /api/comment/report
 * Handles reporting a comment by sending notifications to all admins.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      commentId,
      reporterName,
      reportTime,
      commentText,
      commentAt,
      targetUrl,
      authorName,
    } = body;

    if (!commentId || !commentText) {
      return NextResponse.json(
        { success: false, error: "参数不完整" },
        { status: 400 },
      );
    }

    // 1. 获取所有管理员用户
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { userid: true },
    });

    if (admins.length === 0) {
      return NextResponse.json(
        { success: true, message: "已记录举报（暂无在线管理员）" },
        { status: 200 },
      );
    }

    const adminIds = admins.map((a) => a.userid);

    // 2. 格式化举报通知内容
    const message = `[举报通知]
举报人：${reporterName || "未登录游客"}
举报时间：${reportTime}
举报内容：${commentText}
发布时间：${commentAt}
发布者：${authorName}
请及时处理。`;

    // 3. 发送系统通知给所有管理员
    await notificationService.triggerSystemNotification(
      adminIds,
      message,
      targetUrl,
    );

    return NextResponse.json({ success: true, message: "举报已提交" });
  } catch (error) {
    console.error("[POST /api/comment/report] Error:", error);
    return NextResponse.json(
      { success: false, error: "提交举报失败" },
      { status: 500 },
    );
  }
}
