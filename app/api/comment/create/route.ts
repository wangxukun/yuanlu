import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/core/auth/guard";
import { generateSignatureUrl } from "@/lib/oss";
import { notificationService } from "@/core/notification/notification.service";
import { NotificationType } from "@/core/notification/notification.entity";

export async function POST(request: Request) {
  try {
    // 1. 鉴权
    // Web Cookie 优先，移动端 Bearer Token 兜底（Android 端依赖）
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;

    const currentUserId = authResult.session.user.userid;

    // [安全修复] 检查用户是否被禁止评论
    const userRecord = await prisma.user.findUnique({
      where: { userid: currentUserId },
      select: { isCommentAllowed: true },
    });
    if (!userRecord || userRecord.isCommentAllowed === false) {
      return NextResponse.json(
        { error: "您的评论权限已被限制，如有疑问请联系管理员" },
        { status: 403 },
      );
    }

    const { episodeid, content, parentId } = await request.json();

    if (!episodeid || !content || !content.trim()) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // 2. 写入数据库
    // 注意：Prisma schema 中 comments 表的 commentid 是自增 Int，不需要手动生成
    const newComment = await prisma.comments.create({
      data: {
        userid: currentUserId,
        episodeid: episodeid,
        commentText: content,
        commentAt: new Date(),
        parentId: parentId ?? null,
      },
      // 创建后立即返回关联的用户信息，方便前端直接追加到列表，无需刷新
      include: {
        User: {
          select: {
            userid: true,
            email: true,
            user_profile: {
              select: {
                nickname: true,
                avatarFileName: true,
                avatarUrl: true,
                learnLevel: true,
              },
            },
          },
        },
      },
    });

    type CommentsWithAvatar = typeof newComment & {
      User: {
        user_profile: {
          avatarFileName: string;
        };
      };
    };

    const safeComment = newComment as CommentsWithAvatar;

    const commentWithAvatar = {
      ...safeComment,
      User: {
        ...safeComment.User,
        user_profile: {
          ...safeComment.User.user_profile,
          avatarUrl: safeComment.User.user_profile.avatarFileName
            ? await generateSignatureUrl(
                safeComment.User.user_profile.avatarFileName,
                3600 * 3,
              )
            : null,
        },
      },
    };

    // 3. 异步触发通知（不阻塞响应，错误静默处理）
    const commenterNickname =
      newComment.User?.user_profile?.nickname ||
      newComment.User?.email ||
      "有人";
    const targetUrl = `/episode/${episodeid}#comment-${newComment.commentid}`;

    void triggerCommentNotification({
      parentId: parentId ?? null,
      episodeid,
      currentUserId,
      commenterNickname,
      targetUrl,
    });

    return NextResponse.json(commentWithAvatar);
  } catch (error) {
    console.error("Failed to post comment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * 异步触发评论通知，不阻塞主请求
 * - 回复评论：通知原评论作者
 * - 新评论：通知剧集上传者
 */
async function triggerCommentNotification({
  parentId,
  episodeid,
  currentUserId,
  commenterNickname,
  targetUrl,
}: {
  parentId: number | null;
  episodeid: string;
  currentUserId: string;
  commenterNickname: string;
  targetUrl: string;
}) {
  try {
    if (parentId) {
      // 场景一：回复评论 → 通知原评论作者
      const parentComment = await prisma.comments.findUnique({
        where: { commentid: parentId },
        select: { userid: true },
      });

      // 不通知自己
      if (parentComment?.userid && parentComment.userid !== currentUserId) {
        await notificationService.createNotification({
          userid: parentComment.userid,
          notificationText: `${commenterNickname} 回复了你的评论`,
          type: NotificationType.COMMENT,
          targetUrl,
        });
      }
    } else {
      // 场景二：新评论 → 通知剧集上传者
      const episode = await prisma.episode.findUnique({
        where: { episodeid },
        select: { uploaderid: true },
      });

      // 不通知自己
      if (episode?.uploaderid && episode.uploaderid !== currentUserId) {
        await notificationService.createNotification({
          userid: episode.uploaderid,
          notificationText: `${commenterNickname} 评论了你的剧集`,
          type: NotificationType.COMMENT,
          targetUrl,
        });
      }
    }

    // 场景三：通知所有管理员
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { userid: true },
    });

    const adminIdsToNotify = admins
      .map((admin) => admin.userid)
      .filter((id) => id !== currentUserId);

    if (adminIdsToNotify.length > 0) {
      const episode = await prisma.episode.findUnique({
        where: { episodeid },
        select: { title: true },
      });
      const episodeTitle = episode?.title || "某剧集";

      const actionText = parentId ? "回复了评论" : "发表了新评论";

      await notificationService.triggerSystemNotification(
        adminIdsToNotify,
        `用户 ${commenterNickname} 在剧集「${episodeTitle}」${actionText}`,
        targetUrl,
      );
    }
  } catch (err) {
    // 通知失败不影响评论发布成功
    console.error("[notification] Failed to send comment notification:", err);
  }
}
