import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { generateSignatureUrl } from "@/lib/oss";

export async function POST(request: Request) {
  try {
    const session = await auth();
    // 1. 鉴权
    if (!session?.user?.userid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { episodeid, content } = await request.json();

    if (!episodeid || !content || !content.trim()) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // 2. 写入数据库
    // 注意：Prisma schema 中 comments 表的 commentid 是自增 Int，不需要手动生成
    const newComment = await prisma.comments.create({
      data: {
        userid: session.user.userid,
        episodeid: episodeid,
        commentText: content,
        commentAt: new Date(),
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

    return NextResponse.json(commentWithAvatar);
  } catch (error) {
    console.error("Failed to post comment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
