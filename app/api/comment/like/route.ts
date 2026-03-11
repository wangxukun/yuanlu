import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { notificationService } from "@/core/notification/notification.service";
import { NotificationType } from "@/core/notification/notification.entity";

/**
 * POST /api/comment/like
 * 切换评论点赞状态（点赞 / 取消点赞）
 * 点赞成功后，异步通知评论作者
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.userid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = session.user.userid;
    const { commentId } = await request.json();

    if (!commentId || typeof commentId !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid commentId" },
        { status: 400 },
      );
    }

    // 查询是否已点赞
    const existing = await prisma.comment_likes.findUnique({
      where: {
        userid_commentid: { userid: currentUserId, commentid: commentId },
      },
    });

    if (existing) {
      // 已点赞 → 取消点赞
      await prisma.comment_likes.delete({
        where: {
          userid_commentid: { userid: currentUserId, commentid: commentId },
        },
      });
      return NextResponse.json({ liked: false });
    } else {
      // 未点赞 → 新增点赞
      await prisma.comment_likes.create({
        data: { userid: currentUserId, commentid: commentId },
      });

      // 异步通知评论作者（不阻塞响应）
      void triggerLikeNotification({ commentId, currentUserId });

      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error("[comment/like] Failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * 异步发送点赞通知，不阻塞主响应
 */
async function triggerLikeNotification({
  commentId,
  currentUserId,
}: {
  commentId: number;
  currentUserId: string;
}) {
  try {
    const comment = await prisma.comments.findUnique({
      where: { commentid: commentId },
      select: { userid: true, episodeid: true },
    });

    // 不通知自己
    if (!comment?.userid || comment.userid === currentUserId) return;

    // 获取点赞者昵称
    const liker = await prisma.user_profile.findUnique({
      where: { userid: currentUserId },
      select: { nickname: true },
    });
    const likerName = liker?.nickname ?? "有人";

    await notificationService.createNotification({
      userid: comment.userid,
      notificationText: `${likerName} 赞了你的评论`,
      type: NotificationType.LIKE,
      targetUrl: comment.episodeid
        ? `/episode/${comment.episodeid}`
        : undefined,
    });
  } catch (err) {
    console.error("[notification] Failed to send like notification:", err);
  }
}
