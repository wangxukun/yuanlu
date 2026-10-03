import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/core/auth/guard";

export async function POST(req: Request) {
  try {
    // 1. 验证用户 Session
    // Web Cookie 优先，移动端 Bearer Token 兜底（小程序/Android 端依赖）。
    // 原实现仅认 NextAuth Cookie 会话（auth()），移动端带 Bearer 删除评论恒
    // 401「未授权」；小程序端全局 401 处理会清除本地 token，进而引发其他
    // 页面连环「登录已过期，请重新登录」——与 create/like 对齐改走 requireAuth。
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;

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

    // 4. 权限检查：必须是评论作者或管理员
    const isOwner = comment.userid === session.user.userid;
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
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
