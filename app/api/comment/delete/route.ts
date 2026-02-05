import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. 验证用户 Session
    const session = await auth();
    if (!session || !session.user?.userid) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    // 2. 获取请求参数
    const { commentId } = await req.json();
    if (!commentId) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    // 3. 查找评论以验证所有权
    const comment = await prisma.comments.findUnique({
      where: { commentid: Number(commentId) },
      select: { userid: true },
    });

    if (!comment) {
      return NextResponse.json({ error: "评论不存在" }, { status: 404 });
    }

    // 4. 权限检查：必须是评论作者 (你也可以在这里扩展管理员权限逻辑)
    if (comment.userid !== session.user.userid) {
      return NextResponse.json({ error: "无权删除此评论" }, { status: 403 });
    }

    // 5. 执行删除
    // schema.prisma 中配置了 onDelete: Cascade，所以子回复和点赞会自动删除
    await prisma.comments.delete({
      where: { commentid: Number(commentId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete comment error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
