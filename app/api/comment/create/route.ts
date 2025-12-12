import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

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
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(newComment);
  } catch (error) {
    console.error("Failed to post comment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
